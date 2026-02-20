// --- Gatekeeper State ---
let activeIntentId: string | null = null

export function getActiveIntentId() {
	return activeIntentId
}

export function executePreHook(toolName: string, params: any) {
	if (toolName === "write_to_file" || toolName === "execute_command") {
		if (!activeIntentId) {
			const error = new Error(
				"GOVERNANCE VIOLATION: You attempted to mutate the codebase without an active Intent. You must call select_active_intent(intent_id) first.",
			)
			;(error as any).isGovernanceViolation = true
			throw error
		}
	}
}

export function select_active_intent(intent_id: string) {
	activeIntentId = intent_id
	return `<intent_context id="${intent_id}" />`
}

export async function selectActiveIntent(intentId: string): Promise<{ success: boolean; message: string }> {
	try {
		const cwd = process.cwd()
		const orchestrationDir = path.join(cwd, ".orchestration")
		const intentsFile = path.join(orchestrationDir, "active_intents.yaml")

		const uri = vscode.Uri.file(intentsFile)
		const data = await vscode.workspace.fs.readFile(uri)
		const yaml = Buffer.from(data).toString("utf8")

		const block = PreHook.extractIntentBlock(yaml, intentId)
		if (!block) {
			throw new Error(`Intent ID ${intentId} not found in active_intents.yaml`)
		}

		activeIntentId = intentId
		return { success: true, message: `Intent ${intentId} activated successfully.` }
	} catch (error) {
		return { success: false, message: `Failed to activate intent: ${error.message}` }
	}
}

// --- Existing intent validation logic preserved for compatibility ---
import * as path from "path"
import * as vscode from "vscode"
import type { Intent } from "../models/Intent"

export class PreHook {
	static async validate(activeIntentId: string): Promise<Intent> {
		if (!activeIntentId || activeIntentId.trim().length === 0) {
			throw new Error("You must cite a valid active Intent ID. Call select_active_intent first.")
		}
		const cwd = process.cwd()
		const orchestrationDir = path.join(cwd, ".orchestration")
		const intentsFile = path.join(orchestrationDir, "active_intents.yaml")
		try {
			const uri = vscode.Uri.file(intentsFile)
			const data = await vscode.workspace.fs.readFile(uri)
			const yaml = Buffer.from(data).toString("utf8")
			const block = PreHook.extractIntentBlock(yaml, activeIntentId)
			if (!block) {
				return { id: activeIntentId, owned_scope: ["**"] }
			}
			return block
		} catch {
			return { id: activeIntentId, owned_scope: ["**"] }
		}
	}
	private static extractIntentBlock(yaml: string, id: string): Intent | null {
		const entries = yaml.split(/\n\s*-\s+id:\s*/).slice(1)
		for (const entry of entries) {
			const idMatch = entry.match(/^"?([^"]+)"?/)
			const intentId = idMatch?.[1]
			if (intentId !== id) continue
			const name = entry.match(/\n\s*name:\s*"?([^\"\n]+)"?/i)?.[1]
			const status = entry.match(/\n\s*status:\s*"?([^\"\n]+)"?/i)?.[1]
			const owned_scope: string[] = []
			const scopeBlock =
				entry.match(/owned_scope:\s*\n([\s\S]*?)\n\s*[a-z_]+:/i)?.[1] ||
				entry.match(/owned_scope:\s*\n([\s\S]*)$/i)?.[1]
			if (scopeBlock) {
				for (const line of scopeBlock.split("\n")) {
					const m = line.match(/-\s*"?([^\"\n]+)"?/)
					if (m?.[1]) owned_scope.push(m[1])
				}
			}
			const constraints: string[] = []
			const constraintsBlock =
				entry.match(/constraints:\s*\n([\s\S]*?)\n\s*[a-z_]+:/i)?.[1] ||
				entry.match(/constraints:\s*\n([\s\S]*)$/i)?.[1]
			if (constraintsBlock) {
				for (const line of constraintsBlock.split("\n")) {
					const m = line.match(/-\s*"?([^\"\n]+)"?/)
					if (m?.[1]) constraints.push(m[1])
				}
			}
			const acceptance_criteria: string[] = []
			const acBlock =
				entry.match(/acceptance_criteria:\s*\n([\s\S]*?)\n\s*[a-z_]+:/i)?.[1] ||
				entry.match(/acceptance_criteria:\s*\n([\s\S]*)$/i)?.[1]
			if (acBlock) {
				for (const line of acBlock.split("\n")) {
					const m = line.match(/-\s*"?([^\"\n]+)"?/)
					if (m?.[1]) acceptance_criteria.push(m[1])
				}
			}
			return { id, name, owned_scope, constraints, acceptance_criteria }
		}
		return null
	}
}
