document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const notesList = document.getElementById('notes-list');
    const noteDisplay = document.getElementById('note-display');
    const editorContainer = document.getElementById('editor-container');
    const noteTitleEditor = document.getElementById('note-title-editor');
    const noteBodyEditor = document.getElementById('note-body-editor');
    const newNoteBtn = document.getElementById('new-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const searchInput = document.getElementById('search-input');
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    const versionBtn = document.getElementById('version-btn');
    const devMenu = document.getElementById('dev-menu'); // 追加
    const downloadDataBtn = document.getElementById('download-data-btn'); // 追加
    const uploadDataBtn = document.getElementById('upload-data-btn'); // 追加
    const uploadInput = document.getElementById('upload-input'); // 追加
    const tagsInput = document.getElementById('tags-input');
    const tagsInputContainer = document.querySelector('.tags-input-container');
    const markdownToggle = document.getElementById('markdown-toggle');

    // アプリケーションの状態
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    let activeNoteId = null;
    let saveTimer = null;
    const GIT_COMMIT_HASH = '3659664fae1ad6d407d8549fc06bf8a7fa311bab';
    const GIT_COMMIT_MESSAGE = 'feat: Add favorites and tags functionality';

    // 既存のメモにfavoriteとtagsプロパティを追加（マイグレーション）
    notes.forEach(note => {
        if (note.favorite === undefined) note.favorite = false;
        if (!note.tags) note.tags = [];
        if (!note.history) note.history = [];
        if (note.markdownEnabled === undefined) note.markdownEnabled = false;
    });

    // --- データ管理 ---
    const saveNotes = () => {
        localStorage.setItem('notes', JSON.stringify(notes));
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays < 7) {
            return `${diffDays}日前`;
        } else {
            return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
        }
    };

    // --- UIレンダリング ---
    const renderNotesList = (filter = '') => {
        notesList.innerHTML = '';
        const filteredNotes = notes
            .filter(note => {
                const searchTerm = filter.toLowerCase();
                const bodyMatch = (note.body || '').toLowerCase().includes(searchTerm);
                const tagMatch = note.tags.some(tag => tag.toLowerCase().includes(searchTerm));
                return bodyMatch || tagMatch;
            })
            .sort((a, b) => {
                // お気に入りを先頭に固定
                if (a.favorite && !b.favorite) return -1;
                if (!a.favorite && b.favorite) return 1;
                // 更新日時順
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

        filteredNotes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.classList.add('note-item');
            if (note.id === activeNoteId) {
                noteItem.classList.add('active');
            }
            noteItem.dataset.id = note.id;
            
            const tagsHtml = note.tags.length > 0 
                ? `<div class="note-tags">${note.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
                : '';

            noteItem.innerHTML = `
                <div class="note-item-header">
                    <div class="note-item-title">${escapeHtml(note.title) || '新規メモ'}</div>
                    <span class="favorite-star ${note.favorite ? 'active' : ''}">${note.favorite ? '⭐' : '☆'}</span>
                </div>
                <div class="note-item-date">${formatDate(note.updatedAt)}</div>
                ${tagsHtml}
            `;
            
            // お気に入りボタンのイベントリスナー
            const favoriteBtn = noteItem.querySelector('.favorite-star');
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                note.favorite = !note.favorite;
                saveNotes();
                renderNotesList(searchInput.value);
            });

            // メモクリックイベント
            noteItem.addEventListener('click', (e) => {
                if (e.target.classList.contains('favorite-star')) return;
                activeNoteId = note.id;
                renderActiveNote();
                renderNotesList(searchInput.value);
            });
            
            notesList.appendChild(noteItem);
        });
    };

    const renderActiveNote = () => {
        const activeNote = notes.find(note => note.id === activeNoteId);
        if (activeNote) {
            renderNoteDisplay(activeNote);
            const lines = (activeNote.body || '').split('\n');
            const title = lines.shift() || '';
            const body = lines.join('\n');
            noteTitleEditor.value = title;
            noteBodyEditor.value = body;
            tagsInput.value = activeNote.tags.join(', ');
            markdownToggle.checked = activeNote.markdownEnabled;
        } else {
            noteDisplay.innerHTML = '';
            noteTitleEditor.value = '';
            noteBodyEditor.value = '';
            tagsInput.value = '';
            markdownToggle.checked = false;
        }
    };

    const renderNoteDisplay = (note) => {
        if (!note) {
            noteDisplay.innerHTML = '';
            return;
        }
        const body = note.body || '';
        const lines = body.split('\n');
        const title = lines.shift() || '';
        const titleHtml = `<div>${escapeHtml(title) || '<br>'}</div>`;

        let bodyHtml;

        if (note.markdownEnabled && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            const markdownBody = lines.join('\n');
            bodyHtml = DOMPurify.sanitize(marked.parse(markdownBody));
        } else {
            bodyHtml = lines.map(line => {
                let renderedLine = escapeHtml(line);
                let containerClass = '';

                if (/^\[x\]\s/i.test(line)) {
                    renderedLine = renderedLine.replace(/^\[x\]\s/i, '<span class="task-list-item-checked"></span> ');
                    containerClass = 'task-list-item-container-checked';
                } else if (/^\[ \]\s/.test(line)) {
                    renderedLine = renderedLine.replace(/^\[ \]\s/, '<span class="task-list-item"></span> ');
                    containerClass = 'task-list-item-container';
                }
                
                return `<div class="${containerClass}">${renderedLine || '<br>'}</div>`;
            }).join('');
        }
        
        noteDisplay.innerHTML = titleHtml + bodyHtml;
    };

    // --- モード切替 ---
    const switchToEditMode = () => {
        noteDisplay.style.display = 'none';
        editorContainer.style.display = 'flex'; // 'flex' に変更
        tagsInputContainer.style.display = 'block';
        noteTitleEditor.focus();
    };

    const switchToDisplayMode = () => {
        noteDisplay.style.display = 'block';
        editorContainer.style.display = 'none';
        tagsInputContainer.style.display = 'none';
        const activeNote = notes.find(note => note.id === activeNoteId);
        if (activeNote) {
            renderNoteDisplay(activeNote);
            // タグの更新も保存
            updateNoteTags();
        }
    };

    // --- メモ操作 ---
    const createNewNote = () => {
        const now = new Date();
        const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newNote = {
            id: self.crypto.randomUUID(),
            title: timestamp,
            body: timestamp,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            favorite: false,
            tags: [],
            markdownEnabled: false,
            history: [],
        };
        notes.unshift(newNote);
        activeNoteId = newNote.id;
        saveNotes();
        renderNotesList();
        renderActiveNote();
        switchToEditMode();
        noteTitleEditor.select();
    };

    const deleteActiveNote = () => {
        if (!activeNoteId) return;
        if (confirm('本当にこのメモを削除しますか？')) {
            notes = notes.filter(note => note.id !== activeNoteId);
            activeNoteId = notes.length > 0 ? notes[0].id : null;
            saveNotes();
            renderNotesList();
            renderActiveNote();
            switchToDisplayMode();
        }
    };

    const updateNoteTags = () => {
        if (!activeNoteId) return;
        const activeNote = notes.find(note => note.id === activeNoteId);
        if (activeNote) {
            const newTags = tagsInput.value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            
            if (JSON.stringify(activeNote.tags) !== JSON.stringify(newTags)) {
                activeNote.tags = newTags;
                activeNote.updatedAt = new Date().toISOString();
                saveNotes();
                renderNotesList(searchInput.value);
            }
        }
    };

    const handleEditorInput = () => {
        if (!activeNoteId) return;
        const activeNote = notes.find(note => note.id === activeNoteId);
        if (activeNote) {
            const newTitle = noteTitleEditor.value;
            const newBody = noteBodyEditor.value;
            const newFullBody = `${newTitle}\n${newBody}`;

            if (activeNote.body !== newFullBody) {
                activeNote.body = newFullBody;
                activeNote.title = newTitle || '新規メモ';
                activeNote.updatedAt = new Date().toISOString();
                
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => addHistorySnapshot(activeNote), 60000);
                
                saveNotes();
                renderNotesList(searchInput.value);
            }
        }
    };

    const addHistorySnapshot = (note) => {
        if (!note) return;
        note.history = note.history || [];
        if (note.history.length > 0 && note.history[note.history.length - 1].body === note.body) return;
        note.history.push({ body: note.body, timestamp: new Date().toISOString() });
        if (note.history.length > 10) note.history.shift();
        saveNotes();
    };

    // --- ユーティリティ ---
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    // --- イベントリスナー ---
    newNoteBtn.addEventListener('click', createNewNote);
    deleteNoteBtn.addEventListener('click', deleteActiveNote);
    noteTitleEditor.addEventListener('input', handleEditorInput);
    noteBodyEditor.addEventListener('input', handleEditorInput);
    const handleEditorComponentBlur = () => {
        // フォーカスがエディタとタグ入力の外に移動したかどうかを少し遅れて確認
        setTimeout(() => {
            if (document.activeElement !== noteTitleEditor && 
                document.activeElement !== noteBodyEditor && 
                document.activeElement !== tagsInput) {
                switchToDisplayMode();
            }
        }, 0);
    };

    noteTitleEditor.addEventListener('blur', handleEditorComponentBlur);
    noteBodyEditor.addEventListener('blur', handleEditorComponentBlur);

    noteTitleEditor.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            noteBodyEditor.focus();
        }
    });

    noteBodyEditor.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' && noteBodyEditor.selectionStart === 0 && noteBodyEditor.selectionEnd === 0) {
            e.preventDefault();
            noteTitleEditor.focus();
        }
    });

    tagsInput.addEventListener('blur', () => {
        updateNoteTags();
        handleEditorComponentBlur();
    });
    noteDisplay.addEventListener('click', (e) => {
        if (e.target.matches('.task-list-item, .task-list-item-checked')) {
            // クリックされた行のインデックスを取得
            const clickedDiv = e.target.closest('div');
            const parent = clickedDiv.parentNode;
            const index = Array.prototype.indexOf.call(parent.children, clickedDiv) -1; // タイトル分を引く

            // 対応するテキスト行の状態をトグル
            const activeNote = notes.find(note => note.id === activeNoteId);
            if (activeNote) {
                const lines = activeNote.body.split('\n');
                const targetLine = lines[index + 1]; // タイトル分を足す
                if (targetLine.startsWith('[ ] ')) {
                    lines[index + 1] = targetLine.replace('[ ] ', '[x] ');
                } else if (targetLine.startsWith('[x] ')) {
                    lines[index + 1] = targetLine.replace('[x] ', '[ ] ');
                }
                activeNote.body = lines.join('\n');
                activeNote.updatedAt = new Date().toISOString();
                saveNotes();
                renderActiveNote();
                renderNotesList();
            }
        } else {
            const activeNote = notes.find(note => note.id === activeNoteId);
            if (activeNote && !activeNote.markdownEnabled) {
                switchToEditMode();
            }
        }
    });
    
    searchInput.addEventListener('input', () => renderNotesList(searchInput.value));
    sidebarToggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('show');
    });

    versionBtn.addEventListener('click', () => {
        alert(`バージョン: ${GIT_COMMIT_HASH}\nコミットメッセージ: ${GIT_COMMIT_MESSAGE}`);
        menuDropdown.classList.remove('show');
    });

    // 開発者メニューの表示/非表示を切り替える関数
    const toggleDevMenu = () => {
        if (devMenu.style.display === 'none') {
            devMenu.style.display = 'block';
        } else {
            devMenu.style.display = 'none';
        }
    };

    // LocalStorageのデータをダウンロードする関数
    const downloadLocalStorage = () => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'localStorage_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        menuDropdown.classList.remove('show');
    };

    // LocalStorageのデータをアップロードする関数
    const uploadLocalStorage = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    for (const key in data) {
                        localStorage.setItem(key, data[key]);
                    }
                    alert('LocalStorageのデータが正常にアップロードされました。ページをリロードします。');
                    location.reload();
                } catch (error) {
                    alert('JSONファイルの読み込みに失敗しました。');
                    console.error('Error uploading localStorage:', error);
                }
            };
            reader.readAsText(file);
        }
        menuDropdown.classList.remove('show');
    };

    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target)) menuDropdown.classList.remove('show');
    });

    // 開発者メニューの表示を切り替えるボタンを追加
    const toggleDevMenuBtn = document.createElement('button');
    toggleDevMenuBtn.textContent = '開発者メニュー';
    toggleDevMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDevMenu();
    });
    menuDropdown.insertBefore(toggleDevMenuBtn, devMenu); // devMenuの前に挿入

    // --- イベントリスナー ---
    downloadDataBtn.addEventListener('click', downloadLocalStorage);
    uploadDataBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', uploadLocalStorage);

    // --- 初期化 ---
    const initialize = () => {
        if (notes.length === 0) {
            createNewNote();
        } else {
            activeNoteId = notes[0].id;
            renderNotesList();
            renderActiveNote();
            switchToDisplayMode();
            // 初期のUndo/Redoボタン状態更新
            const activeNote = notes.find(n => n.id === activeNoteId);
            if (activeNote && activeNote.history) {
                currentHistoryIndex = activeNote.history.length - 1;
            }
            updateUndoRedoButtons();
        }
    };

    markdownToggle.addEventListener('change', () => {
        if (!activeNoteId) return;
        const activeNote = notes.find(note => note.id === activeNoteId);
        if (activeNote) {
            activeNote.markdownEnabled = markdownToggle.checked;
            activeNote.updatedAt = new Date().toISOString();
            saveNotes();
            renderActiveNote();
            renderNotesList(searchInput.value);
        }
    });

    initialize();
});
