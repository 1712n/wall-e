interface Env {
	GH_PRIVATE_KEY: string;
	GH_WEBHOOK_SECRET: string;
	ANTHROPIC_API_KEY: string;
	OPENAI_API_KEY: string;
	GEMINI_API_KEY: string;
	JOB_QUEUE: Queue;
}
