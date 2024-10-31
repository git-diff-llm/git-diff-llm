import { from, map } from "rxjs";
import { OpenAI } from "openai";

const apiKey = process.env.OPENAI_API_KEY; // Store your API key in environment variables
const client = new OpenAI({
    apiKey
});

export function getFullCompletion$(prompt: string, model = 'gpt-4o', temperature = 0) {
    const _completion = client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model,
        temperature,
    });

    return from(_completion).pipe(
        map((completion) => {
            const _explanation = completion.choices[0].message.content || 'no explanation received';
            return _explanation;
        }),
    )
}
