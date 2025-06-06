#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Project } from 'ts-morph';

const README_PATH = path.resolve('README.md');
const TS_PATH = path.resolve('src/providers/index.ts');

const SECTIONS = {
	providers: {
		title: '#### Available Providers',
		enum: 'ModelProvider',
	},
	models: {
		title: '#### Available Models',
		enum: 'ModelName',
	},
};

function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractEnumEntries(filePath, enumName) {
	const project = new Project({ useInMemoryFileSystem: false });
	const sourceFile = project.addSourceFileAtPath(filePath);
	const enumDecl = sourceFile.getEnum(enumName);
	if (!enumDecl) throw new Error(`Enum '${enumName}' not found`);

	return enumDecl.getMembers().map((member) => {
		const value = member.getInitializerOrThrow().getText().replace(/['"]/g, '');
		const comment = member.getJsDocs()[0]?.getComment()?.trim() || null;
		return { value, comment };
	});
}

function updateMarkdownSection(content, sectionTitle, newItems) {
	const sectionRegex = new RegExp(`(^${escapeRegex(sectionTitle)}\\s*\\n)([\\s\\S]*?)(?=^###|^$)`, 'gim');

	const match = content.match(sectionRegex);
	if (!match) {
		console.error(`❌ Could not find section "${sectionTitle}"`);
		console.error('Tip: Make sure the exact heading exists with no extra spaces or indentation.');
		throw new Error(`Section "${sectionTitle}" not found.`);
	}

	const newList = newItems.map(({ value, comment }) => (comment ? `- \`${value}\` (${comment})` : `- \`${value}\``)).join('\n');

	const replacement = `${match[0].split('\n')[0]}\n\n${newList}\n`;
	const updated = content.replace(sectionRegex, replacement);
	const changed = updated !== content;

	return { updated, changed };
}

function main() {
	const providerEntries = extractEnumEntries(TS_PATH, SECTIONS.providers.enum).filter(({ value }) => value !== 'unknown');

	const modelEntries = extractEnumEntries(TS_PATH, SECTIONS.models.enum);

	let original = fs.readFileSync(README_PATH, 'utf8');
	let changed = false;
	let updated = original;

	const updateSection = (sectionKey, items) => {
		const { title } = SECTIONS[sectionKey];
		const result = updateMarkdownSection(updated, title, items);
		updated = result.updated;
		changed = changed || result.changed;
	};

	updateSection('providers', providerEntries);
	updateSection('models', modelEntries);

	if (changed) {
		fs.writeFileSync(README_PATH, updated);
		console.log('✅ README.md was updated.');
	} else {
		console.log('ℹ️ No changes needed. README.md is up-to-date.');
	}
}

main();
