/* eslint-disable no-case-declarations,no-console,complexity,max-lines-per-function */
import * as esprima from 'esprima';

export {parseCode, resolveElements};

const parseCode = (codeToParse) => {
    // console.log(esprima.parseScript(codeToParse, { loc: true }));
    return esprima.parseScript(codeToParse,{ loc: true });
};

function generateResolvedElement(line, type, name='', condition='', value=''){
    return {line: line, type: type, name: name, condition: condition, value: value};
}

function resolveFunction(parsedFunction) {
    const line = parsedFunction.loc.start.line;
    const type ='FunctionDeclaration';
    const name = resolveElements(parsedFunction.id);
    const functionDeclaration = generateResolvedElement(line, type, name);
    const paramRes = resolveParams(parsedFunction.params);
    const bodyRes = resolveElements(parsedFunction.body);
    return [].concat(functionDeclaration,paramRes,bodyRes);
}

function resolveParams(params) {
    return params.map((param) => {
        const line = param.loc.start.line;
        const type = 'VariableDeclaration';
        const name = resolveElements(param);
        return generateResolvedElement(line, type, name);});
}

function resolveBlockStatement(parsedBlockStatements) {
    const reducer = (acc, statement) => acc.concat(resolveElements(statement));
    return parsedBlockStatements.reduce(reducer,[]);
}

function resolveVariableDeclaration(parsedDeclarations) {
    return parsedDeclarations.map((declaration) => {
        const line = declaration.loc.start.line;
        const type = 'VariableDeclaration';
        const name = resolveElements(declaration.id);
        return generateResolvedElement(line, type, name);});
}

function resolveAssignmentExpression(parsedAssignmentExpression) {
    const line = parsedAssignmentExpression.loc.start.line;
    const type = 'AssignmentExpression';
    const name = resolveElements(parsedAssignmentExpression.left);
    const value = resolveElements(parsedAssignmentExpression.right);
    return generateResolvedElement(line, type, name, undefined, value);
}

function resolveBinaryExpression(parsedBinaryExpression) {
    const operator = parsedBinaryExpression.operator ;
    const right = resolveElements(parsedBinaryExpression.right);
    const left = resolveElements(parsedBinaryExpression.left);
    return '' + left + ' ' + operator + ' ' + right;
}

function resolveWhileStatement(parsedWhileStatement) {
    const line = parsedWhileStatement.loc.start.line;
    const type = 'WhileStatement';
    const test = resolveBinaryExpression(parsedWhileStatement.test);
    const whileStatement = generateResolvedElement(line, type, undefined, test);
    const body = resolveElements(parsedWhileStatement.body);
    return [].concat(whileStatement,body);
}

function resolveIfStatement(parsedIfStatement, isElseIf) {
    const generateIfType = (isElseIf) => isElseIf ? 'ElseIfStatement' : 'IfStatement';
    const line = parsedIfStatement.loc.start.line;
    const type = generateIfType(isElseIf);
    const test = resolveBinaryExpression(parsedIfStatement.test);
    const ifStatement = generateResolvedElement(line, type, undefined, test);
    const body = resolveElements(parsedIfStatement.consequent);
    if (parsedIfStatement.alternate) { /**if else statements flow**/
        const alternate = (parsedIfStatement.alternate.type === 'IfStatement') ?
            resolveIfStatement(parsedIfStatement.alternate, /*isElseIf*/ true) :
            resolveElements(parsedIfStatement.alternate);
        return [].concat(ifStatement,body,alternate);
    }
    return [].concat(ifStatement,body); /**if statement flow**/
}

function resolveReturnStatement(parsedReturnStatement) {
    const line = parsedReturnStatement.loc.start.line;
    const value = resolveElements(parsedReturnStatement.argument);
    const type ='ReturnStatement';
    return generateResolvedElement(line, type, undefined, undefined, value);
}

function resolveIdentifier(parsedIdentifier) {
    return parsedIdentifier.name;
}

function resolveLiteral(parsedLiteral) {
    return parsedLiteral.value;
}

function resolveMemberExpression(parsedMemberExpression) {
    const object = resolveElements(parsedMemberExpression.object);
    const property = resolveElements(parsedMemberExpression.property);
    switch (parsedMemberExpression.object.type){
        case 'Identifier':
            return object + '[' + property + ']';
        case 'ThisExpression':
            return resolveThisExpression() + property;
    }
}

function resolveUnaryExpression(parsedUnaryExpression) {
    const value = resolveElements(parsedUnaryExpression.argument);
    const operator = parsedUnaryExpression.operator;
    return operator + value;
}

function resolveThisExpression() {
    return 'this.';
}

function resolveElements(parsedCode){
    if(parsedCode){
        switch (parsedCode.type) {
            case 'Program':
                return resolveElements(parsedCode.body[0]);
            case 'AssignmentExpression':
                return resolveAssignmentExpression(parsedCode);
            case 'BinaryExpression':
                return resolveBinaryExpression(parsedCode);
            case 'BlockStatement':
                return resolveBlockStatement(parsedCode.body);
            case 'ExpressionStatement':
                return resolveElements(parsedCode.expression);
            case 'FunctionDeclaration':
                return resolveFunction(parsedCode);
            case 'Identifier':
                return resolveIdentifier(parsedCode);
            case 'IfStatement':
                return resolveIfStatement(parsedCode, /*isElseIf*/ false);
            case 'Literal':
                return resolveLiteral(parsedCode);
            case 'MemberExpression':
                return resolveMemberExpression(parsedCode);
            case 'ReturnStatement':
                return resolveReturnStatement(parsedCode);
            case 'ThisExpression':
                return resolveThisExpression();
            case 'UnaryExpression':
                return resolveUnaryExpression(parsedCode);
            case 'VariableDeclaration':
                return resolveVariableDeclaration(parsedCode.declarations);
            case 'WhileStatement':
                return resolveWhileStatement(parsedCode);
        }
    }
    return ''; /**Maybe Throw Exception**/

}