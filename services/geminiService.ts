import { GoogleGenAI } from "@google/genai";

// Helper function to get the AI client, checking for the API key at the time of use.
const getAiClient = () => {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        // This error will be caught by the UI and shown to the user.
        throw new Error("Gemini API 키가 설정되지 않았습니다. Vercel 배포 설정에서 API_KEY 환경 변수를 추가해주세요.");
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

const model = 'gemini-2.5-flash';

export const evaluateSolution = async (problem: string, solutionImageBase64: string): Promise<string> => {
    try {
        const ai = getAiClient(); // Get client at the time of the call
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
        return response.text;
    } catch (error) {
        console.error("Error evaluating solution:", error);
        if (error instanceof Error) {
            throw new Error(`풀이 피드백을 받는 데 실패했습니다: ${error.message}`);
        }
        throw new Error("풀이 피드백을 받는 데 실패했습니다.");
    }
};

export const getHint = async (problem: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: model,
            contents: `당신은 수학 튜터입니다. 학생이 다음 문제로 어려움을 겪고 있습니다: "${problem}". 학생이 시작하거나 다음 단계로 나아가는 데 도움이 될 작고 간단한 힌트 하나만 제공해주세요. 문제를 직접 풀거나 최종 답을 알려주지 마세요. 힌트는 학생이 생각하도록 유도해야 합니다.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting hint:", error);
        if (error instanceof Error) {
            throw new Error(`힌트를 받는 데 실패했습니다: ${error.message}`);
        }
        throw new Error("힌트를 받는 데 실패했습니다.");
    }
};

export const recognizeFormula = async (formulaImageBase64: string): Promise<string> => {
    try {
        const ai = getAiClient();
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
        return response.text;
    } catch (error) {
        console.error("Error recognizing formula:", error);
         if (error instanceof Error) {
            throw new Error(`수식을 인식하는 데 실패했습니다: ${error.message}`);
        }
        throw new Error("수식을 인식하는 데 실패했습니다.");
    }
};