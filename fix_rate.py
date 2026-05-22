import re

with open("app/server.js", "r") as f:
    content = f.read()

content = content.replace("webhookLimiter, webhookLimiter,", "webhookLimiter,")

with open("app/server.js", "w") as f:
    f.write(content)
