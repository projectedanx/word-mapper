import re

with open("app/server.js", "r") as f:
    content = f.read()

# Add import
import_code = 'import rateLimit from "express-rate-limit";\n'
content = import_code + content

# Create limiter
limiter_code = """
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after a minute"
});
"""

# Find app.post("/im:message:receive_v1"
route_start = content.find('app.post("/im:message:receive_v1"')
if route_start != -1:
    content = content[:route_start] + limiter_code + content[route_start:].replace(
        'app.post("/im:message:receive_v1", express.raw({ type: "application/json" }),',
        'app.post("/im:message:receive_v1", webhookLimiter, express.raw({ type: "application/json" }),'
    )

    # Check if `express.raw` is removed in previous steps. Let's look exactly at how the route is defined now.
    route_pattern = r'app\.post\("/im:message:receive_v1",\n?  express\.raw\(\{ type: "application/json" \}\),\n?  async'
    if not re.search(route_pattern, content):
        content = re.sub(
            r'(app\.post\("/im:message:receive_v1", )(express\.raw\(\{ type: "application/json" \}\), )?',
            r'\1webhookLimiter, \2',
            content
        )

with open("app/server.js", "w") as f:
    f.write(content)

print("Added rate limit to server.js")
