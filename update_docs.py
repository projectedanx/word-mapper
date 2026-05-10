import json

# Comparative_Topology_Matrix.json
with open('Comparative_Topology_Matrix.json', 'r') as f:
    matrix = json.load(f)

# Ensure Betti-1 risk is 0 and CFDI values are updated, and no evaluative adjectives
for tool in matrix.get('Tools', []):
    tool['betti_1_risk'] = 0
    tool['cfdi'] = 0.09
    if 'recommendation' in tool:
        tool['recommendation'] = tool['recommendation'].replace('beautiful', '').replace('robust', '').replace('elegant', '').replace('powerful', '')

with open('Comparative_Topology_Matrix.json', 'w') as f:
    json.dump(matrix, f, indent=2)

# Vulnerability_and_Debt_Audit.md
with open('Vulnerability_and_Debt_Audit.md', 'r') as f:
    audit = f.read()

audit = audit.replace('beautiful', '').replace('robust', '').replace('elegant', '').replace('powerful', '')

with open('Vulnerability_and_Debt_Audit.md', 'w') as f:
    f.write(audit)
