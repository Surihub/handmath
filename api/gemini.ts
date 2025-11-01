import { GoogleGenAI } from "@google/genai";

// Vercel Serverless Function types for TypeScript (optional but good practice)
// For simplicity, we'll use 'any' for req/res if types aren't set up.
// This default export is the entry point for the Vercel serverless function.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'Gemini API key not configured on the server.' });
        }
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const model = 'gemini-2.5-flash';

        const { action, payload } = req.body;

        if (!action || !payload) {
             return res.status(400).json({ error: 'Missing action or payload.' });
        }
        
        let resultText = '';

        switch (action) {
            case 'evaluate': {
                const { problem, solutionImageBase64 } = payload;
                if (!problem || !solutionImageBase64) {
                     return res.status(400).json({ error: 'Missing problem or solution image.' });
                }
                 const response = await ai.models.generateContent({
                    model: model,
                    contents: {
                        parts: [
                            {
                                text: `당신은 친절하고 격려하는 수학 튜터입니다. 학생이 수학 문제를 풀고 있습니다.
                                문제: "${problem}"
                                학생의 손글씨 풀이는 첨부된 이미지에 있습니다.
                                학생의 풀이를 분석하고 마크다운 형식으로 피드백을 제공해주세요.
                                1. 먼저, 최종 답이 맞았는지 틀렸는지 알려주세요.
                                2. 단계별 풀이 과정을 검토해주세요.
                                3. 오류가 있다면, 부드럽게 지적하고 올바른 개념을 설명해주세요.
                                4. 풀이 과정이 맞다면, 칭찬해주고 더 효율적인 방법이 있다면 제안해주세요.
                                5. 긍정적이고 지지하는 어조를 유지해주세요.`
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: solutionImageBase64,
                                }
                            }
                        ]
                    }
                });
                resultText = response.text;
                break;
            }
            case 'hint': {
                const { problem } = payload;
                 if (!problem) {
                     return res.status(400).json({ error: 'Missing problem.' });
                }
                const response = await ai.models.generateContent({
                    model: model,
                    contents: `당신은 수학 튜터입니다. 학생이 다음 문제로 어려움을 겪고 있습니다: "${problem}". 학생이 시작하거나 다음 단계로 나아가는 데 도움이 될 작고 간단한 힌트 하나만 제공해주세요. 문제를 직접 풀거나 최종 답을 알려주지 마세요. 힌트는 학생이 생각하도록 유도해야 합니다.`,
                });
                resultText = response.text;
                break;
            }
            case 'recognize': {
                const { formulaImageBase64 } = payload;
                 if (!formulaImageBase64) {
                     return res.status(400).json({ error: 'Missing formula image.' });
                }
                const response = await ai.models.generateContent({
                    model: model,
                    contents: {
                        parts: [
                            {
                                text: `Analyze the attached image, which contains a handwritten mathematical formula. Convert this formula into its corresponding LaTeX string. If the image is unclear or doesn't contain a formula, respond with an error message. Only return the LaTeX string, enclosed in double dollar signs ($$...$$).`
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: formulaImageBase64,
                                }
                            }
                        ]
                    }
                });
                resultText = response.text;
                break;
            }
            default:
                return res.status(400).json({ error: `Invalid action: ${action}` });
        }
        
        res.status(200).json({ result: resultText });

    } catch (error) {
        console.error("Error in /api/gemini:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        res.status(500).json({ error: errorMessage });
    }
}
