/**
 * This function calls our own backend API route, which in turn calls the Gemini API.
 * This is a secure way to use the Gemini API key without exposing it to the client.
 * @param action The specific AI task to perform (e.g., 'evaluate', 'hint').
 * @param payload The data required for the task.
 * @returns The string result from the AI.
 */
async function callApi(action: string, payload: object): Promise<string> {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    const data = await response.json();

    if (!response.ok) {
        // Use the error message from the API route, or a default one.
        throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data.result;
}

export const evaluateSolution = async (problem: string, solutionImageBase64: string): Promise<string> => {
    try {
        return await callApi('evaluate', { problem, solutionImageBase64 });
    } catch (error) {
        console.error("Error evaluating solution:", error);
        // Propagate a user-friendly error message.
        throw new Error(`풀이 피드백을 받는 데 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const getHint = async (problem: string): Promise<string> => {
    try {
        return await callApi('hint', { problem });
    } catch (error) {
        console.error("Error getting hint:", error);
        throw new Error(`힌트를 받는 데 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const recognizeFormula = async (formulaImageBase64: string): Promise<string> => {
    try {
        return await callApi('recognize', { formulaImageBase64 });
    } catch (error) {
        console.error("Error recognizing formula:", error);
        throw new Error(`수식을 인식하는 데 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
