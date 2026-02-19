import * as path from "path"
import * as vscode from "vscode"

import { Task } from "../task/Task"
import { BaseTool, ToolCallbacks } from "./BaseTool"
import type { NativeToolArgs } from "../../shared/tools"

interface SelectActiveIntentParams {
    intent_id: string
}

export class SelectActiveIntentTool extends BaseTool<"select_active_intent"> {
    readonly name = "select_active_intent" as const

    async execute(params: SelectActiveIntentParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
        const { pushToolResult, handleError } = callbacks
        const intentId = params.intent_id

        if (!intentId) {
            pushToolResult("<intent_context>error: missing intent_id</intent_context>")
            return
        }

        try {
            const provider = task.providerRef.deref()
            const cwd = provider?.cwd ?? task.cwd
            const orchestrationPath = path.resolve(cwd ?? process.cwd(), ".orchestration", "active_intents.yaml")
            const fileUri = vscode.Uri.file(orchestrationPath)

            let raw = ""
            try {
                const data = await vscode.workspace.fs.readFile(fileUri)
                raw = Buffer.from(data).toString("utf8")
            } catch (err) {
                // If file not present, return permissive stub
                raw = ""
            }

            // Lightweight YAML block extractor (mirrors PreHook.extractIntentBlock)
            const intent = this.extractIntentBlock(raw, intentId) || { id: intentId, owned_scope: ["**"], constraints: [] }

            const scope = intent.owned_scope?.length ? intent.owned_scope.join(",") : "(none)"
            const constraints = intent.constraints?.length ? intent.constraints.join(",") : "(none)"

            const xml = [`<intent_context>`, `<id>${intent.id}</id>`, `<scope>${scope}</scope>`, `<constraints>${constraints}</constraints>`, `</intent_context>`].join(" ")

            // Persist session state: set activeIntentId and isIntentVerified via provider context proxy
            try {
                if (provider && provider.contextProxy) {
                    await provider.contextProxy.setValue("activeIntentId", intent.id as unknown as any)
                    await provider.contextProxy.setValue("isIntentVerified", true as unknown as any)
                    // Push updated state to webview
                    try {
                        await provider.postStateToWebview()
                    } catch {
                        // best-effort
                    }
                }
            } catch (e) {
                // ignore
            }

            pushToolResult(xml)
        } catch (error) {
            await handleError("select_active_intent", error as Error)
        }
    }

    private extractIntentBlock(yaml: string, id: string): any | null {
        if (!yaml) return null
        const entries = yaml.split(/\n\s*-\s+id:\s*/).slice(1)
        for (const entry of entries) {
            const idMatch = entry.match(/^"?([^\"]+)"?/) as RegExpMatchArray | null
            const intentId = idMatch?.[1]
            if (intentId !== id) continue

            const name = entry.match(/\n\s*name:\s*"?([^\"\n]+)"?/i)?.[1]
            const owned_scope: string[] = []
            const scopeBlock = entry.match(/owned_scope:\s*\n([\s\S]*?)\n\s*[a-z_]+:/i)?.[1] || entry.match(/owned_scope:\s*\n([\s\S]*)$/i)?.[1]
            if (scopeBlock) {
                for (const line of scopeBlock.split('\n')) {
                    const m = line.match(/-\s*"?([^\"\n]+)"?/)
                    if (m?.[1]) owned_scope.push(m[1])
                }
            }

            const constraints: string[] = []
            const constraintsBlock = entry.match(/constraints:\s*\n([\s\S]*?)\n\s*[a-z_]+:/i)?.[1] || entry.match(/constraints:\s*\n([\s\S]*)$/i)?.[1]
            if (constraintsBlock) {
                for (const line of constraintsBlock.split('\n')) {
                    const m = line.match(/-\s*"?([^\"\n]+)"?/)
                    if (m?.[1]) constraints.push(m[1])
                }
            }

            return { id, name, owned_scope, constraints }
        }

        return null
    }
}

export const selectActiveIntentTool = new SelectActiveIntentTool()
