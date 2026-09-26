import re

with open('app/public/app.test.js', 'r') as f:
    content = f.read()

# Make tests 9, 11-14, 16, 20-23 async
content = re.sub(r'test\("([^"]+)", \(\) => {', r'test("\1", async () => {', content)
content = re.sub(r'\.click\(\);', '.click();\n  await new Promise(r => setTimeout(r, 20));', content)

with open('app/public/app.test.js', 'w') as f:
    f.write(content)
print("Updated failing tests to be async")
