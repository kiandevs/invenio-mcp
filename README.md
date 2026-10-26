# invenio-mcp

MCP server for [Invenio](https://invenio.cc). Connects Claude Desktop, Cursor and other MCP clients to Invenio APIs (email risk, fraud checks, OSINT search).

## Setup

```bash
git clone https://github.com/kiandevs/invenio-mcp.git
cd invenio-mcp
npm install
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "invenio": {
      "command": "node",
      "args": ["<PATH_TO_REPO>/dist/index.js"],
      "env": {
        "INVENIO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "invenio": {
      "command": "node",
      "args": ["<PATH_TO_REPO>/dist/index.js"],
      "env": {
        "INVENIO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tools

- `invenio_check_email_risk` - Check email disposable status, MX records, gibberish score and fraud risk.
- `invenio_create_search_task` - Run OSINT search (user, email, phone).
- `invenio_get_search_task` - Fetch search results.
- `invenio_get_account_status` - Check current quota and plan.

## Env

- `INVENIO_API_KEY` (required) - API key from invenio.cc/dashboard/security.
- `INVENIO_BASE_URL` (optional) - Default `https://invenio.cc`.
