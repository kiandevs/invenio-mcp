#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
const DEFAULT_BASE_URL = "https://invenio.cc";
function getApiKey() {
    const key = process.env.INVENIO_API_KEY;
    if (!key) {
        throw new McpError(ErrorCode.InvalidRequest, "INVENIO_API_KEY is missing. Add it to your MCP client env.");
    }
    return key;
}
function getBaseUrl() {
    return (process.env.INVENIO_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}
async function requestInvenio(endpoint, options = {}) {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    let url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    if (options.params) {
        url += `?${new URLSearchParams(options.params).toString()}`;
    }
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "invenio-mcp/1.0.0",
    };
    const init = {
        method: options.method || "GET",
        headers,
    };
    if (options.body) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, init);
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        data = text;
    }
    if (!res.ok) {
        const msg = typeof data === "object" && data?.detail ? data.detail : `HTTP ${res.status}`;
        throw new McpError(ErrorCode.InternalError, `Invenio error: ${msg}`);
    }
    return data;
}
const server = new Server({ name: "invenio-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "invenio_check_email_risk",
            description: "Check if an email is disposable, spam, gibberish or fraud risk.",
            inputSchema: {
                type: "object",
                properties: {
                    email: { type: "string", description: "Email address to check." },
                },
                required: ["email"],
            },
        },
        {
            name: "invenio_create_search_task",
            description: "Start an OSINT search for a username, email or phone.",
            inputSchema: {
                type: "object",
                properties: {
                    term: { type: "string", description: "Query string." },
                    type: {
                        type: "string",
                        enum: ["user", "email", "phone"],
                        description: "Target type.",
                    },
                },
                required: ["term", "type"],
            },
        },
        {
            name: "invenio_get_search_task",
            description: "Get results for an OSINT search task.",
            inputSchema: {
                type: "object",
                properties: {
                    task_id: { type: "string", description: "Task ID." },
                },
                required: ["task_id"],
            },
        },
        {
            name: "invenio_get_account_status",
            description: "Get account plan and remaining search limits.",
            inputSchema: { type: "object", properties: {} },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "invenio_check_email_risk") {
        if (!args || typeof args.email !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "email string required");
        }
        const data = await requestInvenio("/api/v1/risk/email", {
            method: "POST",
            body: { email: args.email },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    if (name === "invenio_create_search_task") {
        if (!args || typeof args.term !== "string" || typeof args.type !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "term and type required");
        }
        const data = await requestInvenio("/api/v1/create-task", {
            method: "POST",
            body: { term: args.term, type: args.type },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    if (name === "invenio_get_search_task") {
        if (!args || typeof args.task_id !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "task_id required");
        }
        const data = await requestInvenio("/api/v1/get-task", {
            method: "GET",
            params: { id: args.task_id },
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    if (name === "invenio_get_account_status") {
        const data = await requestInvenio("/api/v1/auth/me", { method: "GET" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});
const transport = new StdioServerTransport();
await server.connect(transport);
