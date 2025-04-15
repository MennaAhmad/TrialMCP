"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const database_1 = require("./database");
// Create an MCP server
const server = new mcp_js_1.McpServer({
    name: "TODO",
    version: "1.0.0",
});
// Add a tool
server.tool("add-todo", { text: zod_1.z.string() }, async ({ text }) => {
    const todo = database_1.dbOperations.addTodo(text);
    return {
        content: [
            {
                type: "text",
                text: `"${text}" was successfully added to your To Do list with ID: ${todo.id}`,
            },
        ],
    };
});
server.tool("get-todos", {}, async () => {
    const todos = database_1.dbOperations.getTodos();
    if (todos.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "You have no To Do items yet. Use add-todo to create one!",
                },
            ],
        };
    }
    const todoList = todos
        .map((todo) => `${todo.id}: ${todo.text}${todo.completed ? " (completed)" : ""}`)
        .join("\n");
    return {
        content: [
            {
                type: "text",
                text: `You have ${todos.length} To Do item(s):\n${todoList}`,
            },
        ],
    };
});
server.tool("remove-todo", { id: zod_1.z.number() }, async ({ id }) => {
    const todo = database_1.dbOperations.getTodoById(id);
    if (!todo) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: No To Do item found with ID ${id}`,
                },
            ],
        };
    }
    database_1.dbOperations.removeTodo(id);
    return {
        content: [
            {
                type: "text",
                text: `To Do item "${todo.text}" (ID: ${id}) was successfully removed from your list`,
            },
        ],
    };
});
// Start receiving messages on stdin and sending messages on stdout
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("To Do MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});