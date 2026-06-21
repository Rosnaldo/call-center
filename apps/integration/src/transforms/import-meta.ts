// ts-jest AST transformer: replaces `import.meta` with `(globalThis.__importMeta || {})`.
// This allows web modules that use `import.meta.env` to be imported in CJS Jest tests.

export const name = 'import-meta-to-global';
export const version = 1;

export function factory(compilerInstance: any) {
    const ts = compilerInstance.configSet.compilerModule;

    return function (ctx: any) {
        return function (sf: any) {
            function visitor(node: any): any {
                if (
                    ts.isMetaProperty(node) &&
                    node.keywordToken === ts.SyntaxKind.ImportKeyword
                ) {
                    return ts.factory.createParenthesizedExpression(
                        ts.factory.createBinaryExpression(
                            ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier('globalThis'),
                                '__importMeta',
                            ),
                            ts.factory.createToken(ts.SyntaxKind.BarBarToken),
                            ts.factory.createObjectLiteralExpression(),
                        ),
                    );
                }
                return ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitNode(sf, visitor);
        };
    };
}
