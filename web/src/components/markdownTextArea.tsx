import { useState, useRef, useEffect, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";

interface NotionStyleEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
}

export function MarkdownTextarea({
    value = "",
    onChange,
    placeholder = "Escreva algo...",
}: NotionStyleEditorProps) {
    const [lines, setLines] = useState<string[]>(value.split("\n"));
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [cursorPos, setCursorPos] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // sincroniza pra fora sempre que as linhas mudam
    useEffect(() => {
        onChange?.(lines.join("\n"));
    }, [lines]); // eslint-disable-line react-hooks/exhaustive-deps

    // foca a textarea quando activeIndex muda, e posiciona o cursor
    useEffect(() => {
        if (activeIndex !== null && textareaRef.current) {
            const el = textareaRef.current;
            el.focus();
            const pos = cursorPos ?? el.value.length;
            el.setSelectionRange(pos, pos);
            autoResize(el);
        }
    }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    function autoResize(el: HTMLTextAreaElement) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }

    function updateLine(index: number, text: string) {
        setLines((prev) => {
            const next = [...prev];
            next[index] = text;
            return next;
        });
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, index: number) {
        const el = e.currentTarget;
        const pos = el.selectionStart;

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const before = el.value.slice(0, pos);
            const after = el.value.slice(pos);
            setLines((prev) => {
                const next = [...prev];
                next[index] = before;
                next.splice(index + 1, 0, after);
                return next;
            });
            setCursorPos(0);
            setActiveIndex(index + 1);
            return;
        }

        if (e.key === "Backspace" && pos === 0 && index > 0) {
            e.preventDefault();
            setLines((prev) => {
                const prevLineLength = prev[index - 1].length;
                const next = [...prev];
                next[index - 1] = next[index - 1] + next[index];
                next.splice(index, 1);
                setCursorPos(prevLineLength);
                setActiveIndex(index - 1);
                return next;
            });
            return;
        }

        if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault();
            setCursorPos(lines[index - 1].length);
            setActiveIndex(index - 1);
            return;
        }

        if (e.key === "ArrowDown" && index < lines.length - 1) {
            e.preventDefault();
            setCursorPos(0);
            setActiveIndex(index + 1);
            return;
        }
    }

    return (
        <div className="w-full rounded-md border border-border bg-background p-2 text-sm">
            {lines.map((line, index) =>
                activeIndex === index ? (
                    <textarea
                        key={index}
                        ref={textareaRef}
                        value={line}
                        onChange={(e) => {
                            updateLine(index, e.target.value);
                            autoResize(e.target);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onBlur={() => setActiveIndex(null)}
                        rows={1}
                        className="block w-full resize-none overflow-hidden bg-transparent outline-none text-lg"
                    />
                ) : (
                    <div
                        key={index}
                        onClick={() => {
                            setCursorPos(line.length);
                            setActiveIndex(index);
                        }}
                        className="prose prose-sm dark:prose-invert max-w-none min-h-[1.5em] cursor-text [&>*]:my-0"
                    >
                        {line.trim() === "" ? (
                            <span className="text-muted-foreground">
                                {index === 0 ? placeholder : "\u00A0"}
                            </span>
                        ) : (
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-1">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-xl font-bold mb-1">{children}</h2>,
                                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1 text-lg">{children}</ul>,
                                    ol: ({ children, start }) => (
                                        <ol start={start} className="list-decimal pl-4 mb-1 text-lg">
                                            {children}
                                        </ol>
                                    ),
                                    li: ({ children }) => <li className="mb-0.5 text-lg">{children}</li>,
                                    strong: ({ children }) => <strong className="font-bold text-lg">{children}</strong>,
                                    p: ({ children }) => <p className="mb-1 text-lg">{children}</p>,
                                    code: ({ children }) => (
                                        <code className="rounded bg-muted px-1 py-0.5 text-md">{children}</code>
                                    ),
                                }}
                            >{line}</ReactMarkdown>
                        )}
                    </div>
                )
            )}
        </div>
    );
}