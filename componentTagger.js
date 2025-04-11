import { parse } from "@babel/parser";
import MagicString from "magic-string";
import path from "path";

// Simple extension validation
const validExtensions = new Set([".jsx", ".tsx"]);

export function componentTagger() {
  const cwd = process.cwd();
  
  return {
    name: "vite-plugin-component-tagger",
    enforce: "pre",
    async transform(code, id) {
      // Skip if not a valid file
      if (!validExtensions.has(path.extname(id)) || id.includes("node_modules")) {
        return null;
      }

      const relativePath = path.relative(cwd, id).replace(/\\/g, '/');
      
      try {
        // Parse the code
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"]
        });
        
        const magicString = new MagicString(code);
        let currentElement = null;

        const { walk } = await import("estree-walker");
        
        // Walk through the AST
        walk(ast, {
          enter(node) {
            if (node.type === "JSXElement") {
              currentElement = node;
            }
            
            if (node.type === "JSXOpeningElement") {
              const jsxNode = node;
              let elementName;
              
              // Get element name
              if (jsxNode.name.type === "JSXIdentifier") {
                elementName = jsxNode.name.name;
              } else if (jsxNode.name.type === "JSXMemberExpression") {
                const memberExpr = jsxNode.name;
                elementName = `${memberExpr.object.name}.${memberExpr.property.name}`;
              } else {
                return;
              }

              const attributes = jsxNode.attributes.reduce((acc, attr) => {
                if (attr.type === "JSXAttribute") {
                  if (attr.value?.type === "StringLiteral") {
                    acc[attr.name.name] = attr.value.value;
                  } else if (attr.value?.type === "JSXExpressionContainer" && attr.value.expression.type === "StringLiteral") {
                    acc[attr.name.name] = attr.value.expression.value;
                  }
                }
                return acc;
              }, {});
              let textContent = "";
              if (currentElement && currentElement.children) {
                textContent = currentElement.children.map((child) => {
                  if (child.type === "JSXText") {
                    return child.value.trim();
                  } else if (child.type === "JSXExpressionContainer") {
                    if (child.expression.type === "StringLiteral") {
                      return child.expression.value;
                    }
                  }
                  return "";
                }).filter(Boolean).join(" ").trim();
              }
              const content = {};
              if (textContent) {
                content.text = textContent;
              }
              if (attributes.placeholder) {
                content.placeholder = attributes.placeholder;
              }
              if (attributes.className) {
                content.className = attributes.className;
              }

              const line = jsxNode.loc?.start?.line ?? 0;
              const col = jsxNode.loc?.start?.column ?? 0;
              const fileName = path.basename(id);
              const dataComponentId = `${relativePath}:${line}:${col}`;

              // Add component tracking attributes
              magicString.appendLeft(
                jsxNode.name.end ?? 0,
                ` data-apper-id="${dataComponentId}" data-apper-name="${elementName}" data-component-path="${relativePath}" data-component-line="${line}" data-component-file="${fileName}" data-component-name="${elementName}"`
              );
            }
          }
        });

        return {
          code: magicString.toString(),
          map: magicString.generateMap({ hires: true })
        };
      } catch (error) {
        console.error(`Error processing file ${relativePath}:`, error);
        return null;
      }
    }
  };
}