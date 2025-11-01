import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppMode, HistoryEntry, Problem } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { evaluateSolution, getHint, recognizeFormula } from './services/geminiService';
import Canvas, { CanvasRef } from './components/Canvas';
import { HistoryIcon, LightbulbIcon, CheckIcon, NewPageIcon, TrashIcon, CloseIcon, CopyIcon } from './components/Icon';
import LoadingSpinner from './components/LoadingSpinner';
import LatexRenderer from './components/LatexRenderer';

const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>(AppMode.Practice);
    
    const initialProblem: Problem = {
      problem: "이차방정식 $x^2 - 5x + 6 = 0$ 의 두 근을 $\\alpha, \\beta$ 라고 할 때, $\\alpha^2 + \\beta^2$ 의 값을 구하시오.",
      answer: "13"
    };

    const [currentProblem, setCurrentProblem] = useState<Problem | null>(initialProblem);
    const [history, setHistory] = useLocalStorage<HistoryEntry[]>('math-history', []);
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [recognizedText, setRecognizedText] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 400 });

    const canvasRef = useRef<CanvasRef>(null);

    const setLoading = (key: string, value: boolean) => setIsLoading(prev => ({ ...prev, [key]: value }));

    const handleNewProblem = useCallback(async () => {
        setError(null);
        setFeedback(null);
        setHint(null);
        canvasRef.current?.clear();
        // NOTE: Currently uses a fixed problem. 
        // To generate a new one, you would call a service here.
        setCurrentProblem(initialProblem);
    }, [initialProblem]);

    const handleGetHint = useCallback(async () => {
        if (!currentProblem) return;
        setLoading('hint', true);
        setError(null);
        try {
            const hintText = await getHint(currentProblem.problem);
            setHint(hintText);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading('hint', false);
        }
    }, [currentProblem]);

    const handleSubmitSolution = useCallback(async () => {
        if (!currentProblem) return;
        const solutionImageURL = canvasRef.current?.getDataURL();
        if (!solutionImageURL) {
            setError("제출하기 전에 캔버스에 풀이를 작성해주세요.");
            return;
        }
        
        const base64Image = solutionImageURL.split(',')[1];
        if (!base64Image) {
            setError("그림을 처리할 수 없습니다. 다시 시도해주세요.");
            return;
        }

        setLoading('feedback', true);
        setError(null);
        setFeedback(null);

        try {
            const feedbackText = await evaluateSolution(currentProblem.problem, base64Image);
            setFeedback(feedbackText);
            const newHistoryEntry: HistoryEntry = {
                id: new Date().toISOString(),
                problem: currentProblem,
                solutionImage: solutionImageURL,
                feedback: feedbackText,
                timestamp: new Date().toLocaleString('ko-KR'),
            };
            setHistory([newHistoryEntry, ...history]);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading('feedback', false);
        }
    }, [currentProblem, history, setHistory]);

    const handleRecognize = async () => {
        const formulaImageURL = canvasRef.current?.getDataURL();
        if (!formulaImageURL) {
            setError("먼저 캔버스에 수식을 그려주세요.");
            return;
        }
        
        const base64Image = formulaImageURL.split(',')[1];
        if (!base64Image) {
            setError("그림을 처리할 수 없습니다. 다시 시도해주세요.");
            return;
        }

        setLoading('recognize', true);
        setError(null);
        setRecognizedText(null);

        try {
            const text = await recognizeFormula(base64Image);
            setRecognizedText(text);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading('recognize', false);
        }
    };
    
    const handleClearCanvas = () => {
        canvasRef.current?.clear();
        setFeedback(null);
        setHint(null);
        setError(null);
        setRecognizedText(null);
    }
    
    const switchMode = (newMode: AppMode) => {
        setMode(newMode);
        handleClearCanvas();
        if(newMode === AppMode.Practice) {
            setCurrentProblem(initialProblem);
        } else {
            setCurrentProblem(null);
        }
    };
    
    useEffect(() => {
        const updateSize = () => {
            const container = document.getElementById('canvas-container');
            if (container) {
                const width = Math.min(container.offsetWidth - 40, 600);
                const height = width * 0.75;
                setCanvasSize({ width, height });
            }
        };
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-gray-800">
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold">AI 수학 튜터</h1>
                    <div className="flex items-center space-x-2">
                         <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200">
                            <HistoryIcon className="h-7 w-7" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6">
                <div className="bg-white p-3 rounded-lg shadow-md mb-6">
                    <div className="flex border-b border-gray-200">
                        <button onClick={() => switchMode(AppMode.Practice)} className={`px-4 py-2 text-lg font-semibold transition-colors duration-200 ${mode === AppMode.Practice ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}>
                            문제 풀이
                        </button>
                        <button onClick={() => switchMode(AppMode.Recognition)} className={`px-4 py-2 text-lg font-semibold transition-colors duration-200 ${mode === AppMode.Recognition ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}>
                            손글씨 인식
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {/* Left Panel */}
                    <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
                        {mode === AppMode.Practice ? (
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-gray-700">오늘의 문제</h2>
                                <div className="bg-slate-50 p-4 rounded-lg min-h-[120px] border border-gray-200 flex items-center justify-center">
                                    {isLoading['problem'] ? <p>문제를 생성하는 중...</p> : <LatexRenderer className="text-xl">{currentProblem?.problem || ''}</LatexRenderer>}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <ActionButton onClick={handleNewProblem} icon={<NewPageIcon className="h-5 w-5 mr-2" />} text="새 문제" loading={isLoading['problem']} />
                                    <ActionButton onClick={handleGetHint} icon={<LightbulbIcon className="h-5 w-5 mr-2" />} text="힌트 보기" loading={isLoading['hint']} disabled={!currentProblem} />
                                </div>
                                {hint && <ResponseCard title="💡 힌트" content={hint} />}
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold mb-2 text-gray-700">수식 인식</h2>
                                <p className="text-gray-600 mb-4">캔버스에 수학 수식을 쓰면 AI가 텍스트로 변환해줍니다.</p>
                                 {recognizedText && (
                                    <div className="mt-4 bg-slate-50 p-4 rounded-lg border">
                                        <h3 className="font-semibold text-gray-700 mb-2">인식된 LaTeX:</h3>
                                        <div className="relative">
                                            <textarea readOnly value={recognizedText} className="w-full p-2 border rounded bg-white font-mono text-sm" rows={3}></textarea>
                                            <button onClick={() => navigator.clipboard.writeText(recognizedText)} className="absolute top-2 right-2 p-1.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors">
                                                <CopyIcon className="h-5 w-5 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {error && <div className="mt-4 bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}
                         {feedback && <ResponseCard title="📝 AI 피드백" content={feedback} />}
                    </div>
                    {/* Right Panel */}
                    <div id="canvas-container" className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
                         <h2 className="text-2xl font-bold mb-4 text-gray-700">{mode === AppMode.Practice ? '나의 풀이 과정' : '손글씨 입력'}</h2>
                        <Canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />
                        <div className="mt-4 flex flex-wrap gap-3">
                            {mode === AppMode.Practice ? (
                                <ActionButton onClick={handleSubmitSolution} icon={<CheckIcon className="h-5 w-5 mr-2" />} text="제출" loading={isLoading['feedback']} primary disabled={!currentProblem} />
                            ) : (
                                <ActionButton onClick={handleRecognize} icon={<CheckIcon className="h-5 w-5 mr-2" />} text="인식하기" loading={isLoading['recognize']} primary />
                            )}
                             <ActionButton onClick={handleClearCanvas} icon={<TrashIcon className="h-5 w-5 mr-2" />} text="지우기" />
                        </div>
                    </div>
                </div>
            </main>
            
            <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} setHistory={setHistory}/>
        </div>
    );
};

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    text: string;
    loading?: boolean;
    primary?: boolean;
    disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, text, loading, primary, disabled }) => (
    <button
        onClick={onClick}
        disabled={loading || disabled}
        className={`flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-white transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            primary ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
        } ${ (loading || disabled) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105' }`}
    >
        {loading ? <LoadingSpinner /> : icon}
        <span className="ml-2">{text}</span>
    </button>
);

const ResponseCard: React.FC<{ title: string; content: string }> = ({ title, content }) => (
    <div className="mt-6 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        <h3 className="font-bold text-lg text-indigo-800 mb-2">{title}</h3>
        <div className="prose prose-sm max-w-none text-gray-800">
           <LatexRenderer>{content}</LatexRenderer>
        </div>
    </div>
);

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryEntry[];
    setHistory: (history: HistoryEntry[]) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, history, setHistory }) => {
    if (!isOpen) return null;
    return (
        <div className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">학습 기록</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon className="h-6 w-6"/></button>
                </div>
                
                {history.length > 0 && 
                  <div className="p-4 border-b">
                      <button onClick={() => setHistory([])} className="w-full flex items-center justify-center px-4 py-2 rounded-md font-semibold text-white transition bg-red-600 hover:bg-red-700 shadow-sm">
                          <TrashIcon className="h-5 w-5 mr-2"/> 기록 전체 삭제
                      </button>
                  </div>
                }

                <div className="overflow-y-auto h-[calc(100vh-130px)] p-4">
                    {history.length === 0 ? (
                        <p className="text-center text-gray-500 mt-8">아직 기록이 없습니다. <br/>문제를 풀고 기록을 확인해보세요.</p>
                    ) : (
                        <ul className="space-y-4">
                            {history.map(entry => (
                                <li key={entry.id} className="bg-slate-50 p-4 rounded-lg border">
                                    <p className="text-sm text-gray-500 mb-2">{entry.timestamp}</p>
                                    <div className="font-semibold mb-2">
                                        <LatexRenderer>{entry.problem.problem}</LatexRenderer>
                                    </div>
                                    <div className="mb-2">
                                        <p className="font-medium text-sm text-gray-600 mb-1">나의 풀이:</p>
                                        <img src={entry.solutionImage} alt="User solution" className="rounded-md border-2 border-gray-300 w-full"/>
                                    </div>
                                    <div>
                                         <p className="font-medium text-sm text-gray-600 mb-1">AI 피드백:</p>
                                        <div className="prose prose-sm max-w-none text-gray-700 p-2 bg-white rounded border">
                                          <LatexRenderer>{entry.feedback}</LatexRenderer>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
