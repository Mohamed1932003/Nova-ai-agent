import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [documentNamespace, setDocumentNamespace] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const uploadDocument = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setUploadStatus("Uploading document...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/ingest", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Upload failed");
      if (!data.namespace) throw new Error("The server did not create a document workspace");
      setDocumentNamespace(data.namespace);
      setMessages([]);
      setUploadStatus("Document is ready");
    } catch (error) {
      setUploadStatus(error.message);
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading || uploading) return;
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", text: question }]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, namespace: documentNamespace, sessionId: documentNamespace || "default" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Chat request failed");
      setMessages((current) => [...current, { role: "ai", text: data.answer }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "ai", text: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="appShell">
      <header className="header">
        <div className="logo">N</div>
        <div><h1>Nova Notes</h1><p>Chat with your documents</p></div>
        <span className="online"><i /> online</span>
      </header>

      <main className="mainLayout">
        <section className="chatPanel">
          <div className="chatTitle">
            <div><p className="label">DOCUMENT CHAT</p><h2>What would you like to know?</h2></div>
            {fileName && <div className="documentBadge"><span>PDF</span>{fileName}</div>}
          </div>

          <div className="messages">
            {messages.length === 0 && <div className="emptyState"><span>✎</span><h3>Start a conversation</h3><p>Attach a PDF below, then ask a question about it.</p></div>}
            {messages.map((message, index) => <div key={index} className={`messageRow ${message.role}`}><div className="messageBubble">{message.role === "ai" ? <ReactMarkdown>{message.text}</ReactMarkdown> : message.text}</div></div>)}
            {loading && <div className="messageRow ai"><div className="messageBubble typing">Thinking<span>.</span><span>.</span><span>.</span></div></div>}
            <div ref={endRef} />
          </div>

          <div className="composerArea">
            {uploadStatus && <div className={`uploadNotice ${uploading ? "busy" : uploadStatus === "Document is ready" ? "success" : "error"}`}><span className="noticeFile">PDF</span><span>{fileName}</span><b>{uploadStatus}</b></div>}
            <div className="composer">
              <label className="attachButton" htmlFor="pdf-upload" title="Attach PDF">+</label>
              <input id="pdf-upload" className="hiddenInput" type="file" accept="application/pdf,.pdf" onChange={(event) => uploadDocument(event.target.files?.[0])} />
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Message Nova..." rows={1} />
              <button className="sendButton" onClick={sendMessage} disabled={loading || uploading || !documentNamespace || !input.trim()}>↑</button>
            </div>
            <p className="hint">Attach a PDF with + · Enter to send</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
