import re

with open('app/public/app.js', 'r') as f:
    content = f.read()

helper = """
function parseMcpResponse(result) {
  if (result.isError) {
    const errorContent = result.content[0].text;
    let errorObj;
    try {
      errorObj = JSON.parse(errorContent);
    } catch (e) {
      throw new Error(errorContent || "Request failed");
    }
    throw new Error(errorObj.structured_detail?.error || errorObj.error_code || "Request failed");
  }
  return JSON.parse(result.content[0].text);
}
"""

# Insert helper function at the top after imports (if any) or right before the first DOM load logic
content = helper + "\n" + content

pattern = re.compile(
    r'\s*if\s*\(result\.isError\)\s*\{\s*const\s*errorContent\s*=\s*result\.content\[0\]\.text;\s*let\s*errorObj;\s*try\s*\{\s*errorObj\s*=\s*JSON\.parse\(errorContent\);\s*\}\s*catch\s*\(e\)\s*\{\s*throw\s*new\s*Error\(errorContent\s*\|\|\s*"Request\s*failed"\);\s*\}\s*throw\s*new\s*Error\(errorObj\.structured_detail\?\.error\s*\|\|\s*errorObj\.error_code\s*\|\|\s*"Request\s*failed"\);\s*\}\s*const\s*data\s*=\s*JSON\.parse\(result\.content\[0\]\.text\);',
    re.MULTILINE
)

new_content = pattern.sub(
    '\n      const data = parseMcpResponse(result);',
    content
)

with open('app/public/app.js', 'w') as f:
    f.write(new_content)

print("Done")
