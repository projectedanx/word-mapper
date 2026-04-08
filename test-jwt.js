const jwt = require("jsonwebtoken");
const token = jwt.sign({ user_id: "test", tenant_id: "test" }, "dummy", { algorithm: "HS256" });
console.log(token);
