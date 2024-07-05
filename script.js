const apiKey = 'AIzaSyAeLNPl20qikx_tzt2fOSuGIbCy-3VhKCE';
let videoCount = 0;
let draggingContainer = null;
const addedVideos = new Set();

document.getElementById('create-new').addEventListener('click', function() {
    document.getElementById('main').classList.add('hidden');
    document.getElementById('edit-screen').classList.remove('hidden');
    document.getElementById('create-new').classList.add('hidden');
    document.getElementById('import-playlist').classList.add('hidden');
    document.getElementById('add-video').classList.remove('hidden');
});

document.getElementById('add-video').addEventListener('click', function() {
    document.getElementById('video-input').classList.toggle('hidden');
});

document.getElementById('submit-video').addEventListener('click', function() {
    const url = document.getElementById('video-url').value;
    const videoId = extractVideoId(url);
    
    if (addedVideos.has(videoId)) {
        alert('この動画は既に追加されています。');
        return;
    }

    if (videoId) {
        fetchVideoTitle(videoId)
            .then(title => {
                addVideoToList(videoId, title);
                document.getElementById('video-url').value = '';
                document.getElementById('video-input').classList.add('hidden');
            })
            .catch(error => {
                console.error('動画タイトルの取得に失敗しました:', error);
            });
    } else {
        alert('有効なYouTubeの動画URLを入力してください。');
    }
});

document.getElementById('import-playlist').addEventListener('click', async function() {
    const playlistUrl = document.getElementById('playlist-url').value;
    const playlistId = extractPlaylistId(playlistUrl);

    if (playlistId) {
        document.getElementById('main').classList.add('hidden');
        document.getElementById('edit-screen').classList.remove('hidden');
        document.getElementById('create-new').classList.add('hidden');
        document.getElementById('import-playlist').classList.add('hidden');
        document.getElementById('add-video').classList.remove('hidden');

        try {
            let nextPageToken = '';
            let allVideos = [];

            do {
                const url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&key=${apiKey}&part=snippet&maxResults=50&pageToken=${nextPageToken}`;
                const response = await fetch(url);
                const data = await response.json();
                allVideos = allVideos.concat(data.items);
                nextPageToken = data.nextPageToken;
            } while (nextPageToken);

            allVideos.forEach(video => {
                const videoId = video.snippet.resourceId.videoId;
                if (!addedVideos.has(videoId)) {
                    addVideoToList(videoId, video.snippet.title);
                }
            });
        } catch (error) {
            console.error('再生リストの取得に失敗しました:', error);
        }
    } else {
        alert('有効なYouTubeの再生リストURLを入力してください。');
    }
});

function addVideoToList(videoId, title) {
    addedVideos.add(videoId);

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = '動画サムネイル';
    img.className = 'thumbnail';
    
    const titleText = truncateText(title, 100);
    const titleElement = document.createElement('p');
    titleElement.textContent = titleText;

    const container = document.createElement('div');
    container.classList.add('video-item');

    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-container');
    videoContainer.appendChild(createNumberElement());
    videoContainer.appendChild(img);
    videoContainer.appendChild(titleElement);

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&#10005;';
    closeButton.classList.add('close-button');
    closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        container.remove();
        updateNumbers();
        addedVideos.delete(videoId);
    });
    videoContainer.appendChild(closeButton);

    videoContainer.addEventListener('click', () => {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    });

    container.appendChild(videoContainer);

    videoContainer.draggable = true;
    videoContainer.addEventListener('dragstart', dragStart);
    videoContainer.addEventListener('dragend', dragEnd);

    if (videoCount < 100) {
        document.getElementById('video-list').appendChild(container);
    } else {
        document.getElementById('drag-target').appendChild(container);
    }

    updateNumbers();
    videoCount++;
}

async function fetchVideoTitle(videoId) {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items[0].snippet.title;
    } catch (error) {
        throw new Error('動画のタイトルの取得に失敗しました。');
    }
}

function extractPlaylistId(url) {
    const regExp = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2];
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

function createNumberElement() {
    const numberElement = document.createElement('div');
    numberElement.classList.add('number');
    numberElement.textContent = `${videoCount + 1}.`;
    return numberElement;
}

function updateNumbers() {
    const videoContainers = document.querySelectorAll('.video-container');
    videoContainers.forEach((container, index) => {
        container.querySelector('.number').textContent = `${index + 1}.`;
    });
}

function dragStart(event) {
    draggingContainer = this.closest('.video-item');
    setTimeout(() => {
        draggingContainer.style.opacity = '0.5';
    }, 0);
}

function dragEnd() {
    draggingContainer.style.opacity = '';
    draggingContainer = null;
    removeDragAfterElement();
}

function dragOver(event) {
    event.preventDefault();
    const container = event.target.closest('.scrollable-container');
    if (!container) return;

    const afterElement = getDragAfterElement(container, event.clientY);
    const dragAfterElement = container.querySelector('.drag-after');
    if (dragAfterElement) {
        dragAfterElement.remove();
    }
    if (afterElement == null) {
        container.appendChild(createDragAfterElement());
    } else {
        container.insertBefore(createDragAfterElement(), afterElement);
    }
}

function drop(event) {
    event.preventDefault();
    const container = event.target.closest('.scrollable-container');
    if (!container) return;

    const afterElement = getDragAfterElement(container, event.clientY);
    if (draggingContainer != null) {
        if (afterElement == null) {
            container.appendChild(draggingContainer);
        } else {
            container.insertBefore(draggingContainer, afterElement);
        }
    }
    removeDragAfterElement();
    updateNumbers();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.video-item:not(.dragging)')];

    if (draggableElements.length === 0) {
        return null;
    }

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function createDragAfterElement() {
    const dragAfter = document.createElement('div');
    dragAfter.classList.add('drag-after');
    return dragAfter;
}

function removeDragAfterElement() {
    const dragAfter = document.querySelector('.drag-after');
    if (dragAfter) {
        dragAfter.remove();
    }
}

// ドラッグアンドドロップのためのイベントリスナーを追加
['video-list', 'drag-target'].forEach(id => {
    const container = document.getElementById(id);
    container.addEventListener('dragover', dragOver);
    container.addEventListener('drop', drop);
});

function extractVideoId(url) {
    const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match && match[1];
}
