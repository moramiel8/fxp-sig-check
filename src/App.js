import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';

const MAX_WIDTH = 500;
const MAX_HEIGHT = 295;
const CLOUD_NAME = "drx7qeajs";
const UPLOAD_PRESET = "unsigned_preset";

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageURL, setImageURL] = useState('');
  const [previewURL, setPreviewURL] = useState('');
  const [noteText, setNoteText] = useState('');
  const [privateText, setPrivateText] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteToken, setDeleteToken] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const deleteFromCloudinary = async () => {
    if (!deleteToken) return alert("אין טוקן למחיקה.");
    try {
      await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/delete_by_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: deleteToken }),
      });
      setDeleted(true);
      setTimeout(() => setDeleted(false), 2500);
      setPreviewURL('');
      setDeleteToken(null);
      setNoteText('');
      setPrivateText('');
      setIsValid(false);
      setImageURL('');
    } catch {
      alert("מחיקה נכשלה");
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.secure_url) {
      if (data.delete_token) setDeleteToken(data.delete_token);
      return data.secure_url;
    } else {
      throw new Error("Upload failed");
    }
  };

  const processImage = (url) => {
    const img = new Image();
    img.onload = () => {
      const isLarge = img.width > MAX_WIDTH || img.height > MAX_HEIGHT;
      setIsValid(!isLarge);
      if (isLarge) {
        setNoteText(`הערה:\nצנזור חתימה עקב גודל.\nנשלחה פרטית.\n${url}`);
        setPrivateText(`פרטית:\nהיי, נאלצתי לצנזר את החתימה שלך כי היא גדולה מדי.\n${url}\nממליץ להשתמש באתר:\nhttps://imageresizer.com/\nhttps://www.fxp.co.il/showthread.php?t=12726108`);
      } else {
        setNoteText('');
        setPrivateText('');
      }
      setPreviewURL(url);
    };
    img.src = url;
  };

  const handleImage = async (file) => {
    try {
      setIsUploading(true);
      const uploadedURL = await uploadToCloudinary(file);
      setImageSrc(file);
      processImage(uploadedURL);
    } catch {
      alert("שגיאה בהעלאה ל-Cloudinary");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    console.log("Dropped files:", acceptedFiles);
    handleImage(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'image/jpg': [],
      'image/webp': [],
      'image/gifv': []
    },
    multiple: false,
  });

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        handleImage(file);
        break;
      }
    }
  };

  const handleURLSubmit = async () => {
    setIsUploading(true);
    try {
      const proxy = "https://corsproxy.io/?url=";
      const proxiedURL = proxy + encodeURIComponent(imageURL);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        processImage(proxiedURL);
        setIsUploading(false);
        setImageURL('');
      };
      img.onerror = () => {
        alert("לא ניתן לטעון את התמונה.");
        setIsUploading(false);
      };
      img.src = proxiedURL;
    } catch {
      alert("אירעה שגיאה בעת טעינת התמונה");
      setIsUploading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('העתקה נכשלה');
    }
  };

  const handleFinish = () => {
    setPreviewURL('');
    setImageSrc(null);
    setDeleteToken(null);
    setNoteText('');
    setPrivateText('');
    setImageURL('');
    setIsValid(false);
  };

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className="App">
      <header>
        <h1>בדיקת גודל חתימה</h1>
        <p>תומך יקר, הכלי נועד לעזור לך לצנזר חתימות במהירות. תיהנה!</p>
      </header>

      <div {...getRootProps()} className="dropzone custom">
        <input {...getInputProps()} />
        <p>לחץ לבחירת קובץ</p>
      </div>

      <div className="url-input">
        <input
          type="text"
          placeholder="הזן URL של תמונה"
          value={imageURL}
          onChange={(e) => setImageURL(e.target.value)}
        />
        <button onClick={handleURLSubmit}>העלה תמונה</button>
      </div>

      {isUploading && (
        <div className="loader">
          <div className="spinner"></div>
          <p>מעלה תמונה...</p>
        </div>
      )}

{previewURL && (
        <div className="preview">
          {deleteToken && (
            <div className="upload-warning">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                כאשר מעלים תמונה מהמחשב – היא נשמרת זמנית בשרת העלאות חיצוני (Cloudinary).<br />
                מומלץ למחוק את התמונה בסיום הבדיקה.<br />
                התמונה תימחק אוטומטית תוך 10 דקות אם לא תימחק ידנית.
              </div>
            </div>
          )}

          <div className="image-wrapper">
            <img src={previewURL} alt="תצוגה מקדימה" />
          </div>

          {deleteToken && (
            <>
              <div className="upload-warning-delete">
                <div className="warning-icon">❗</div>
                <div className="warning-text">
                  מחיקת התמונה תמחק גם את ההערה והפרטית שנוצרו (אם החתימה לא תקינה).
                </div>
              </div>
              <div className="delete-wrapper">
                <button className="delete-button" onClick={deleteFromCloudinary}>מחק תמונה</button>
              </div>
            </>
          )}


          {!isValid && (
            <div className="warnings">
              <div className="warning">
                <h3>הערה:</h3>
                <textarea readOnly value={noteText}></textarea>
                <button className="copy-button" onClick={() => handleCopy(noteText)}>העתק</button>
              </div>
              <div className="warning">
                <h3>פרטית:</h3>
                <textarea readOnly value={privateText}></textarea>
                <button className="copy-button" onClick={() => handleCopy(privateText)}>העתק</button>
              </div>
            </div>
          )}

          {isValid && <p className="valid">החתימה תקינה!</p>}
        </div>
      )}

      {(previewURL || noteText || privateText) && (
        <div style={{ marginTop: '2rem' }}>
          <button className="copy-button finish-button" onClick={handleFinish}>סיימתי</button>
        </div>
      )}

      {copied && <div className="copy-popup">הטקסט הועתק</div>}
      {deleted && <div className="delete-popup">התמונה נמחקה</div>}

      <footer style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#555' }}>
        <img src="https://www.fxp.co.il/favicon.ico" alt="FXP" style={{ width: '20px', verticalAlign: 'middle', marginLeft: '8px' }} />
        תוכנת ועוצב על ידי <a href="https://www.fxp.co.il/member.php?u=1313219" target="_blank" rel="noopener noreferrer">zhang</a>
      </footer>
    </div>
  );
}

export default App;