import re

with open('app/public/app.test.js', 'r') as f:
    content = f.read()

# Replace structured_detail error to match the expectation in app.js
content = content.replace('structured_detail: { error: "Something went wrong" }', 'error: "Something went wrong"')
content = content.replace('structured_detail: { error: "Mine error occurred" }', 'error: "Mine error occurred"')
content = content.replace('structured_detail: { error: "Symbiosis error occurred" }', 'error: "Symbiosis error occurred"')
content = content.replace('structured_detail: { error: "Paraconsistent error occurred" }', 'error: "Paraconsistent error occurred"')

with open('app/public/app.test.js', 'w') as f:
    f.write(content)
print("Fixed error structures")
