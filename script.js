const player = videojs('my-video', {
    controls: true,
    fluid: true,
    controlBar: {
        fullscreenToggle: true,
        volumePanel: {
            inline: false
        }
    }
});

const defaultM3uUrl = 'https://raw.githubusercontent.com/Sakubaba00/saku/refs/heads/main/playlist1.m3u';

const m3uFileInput = document.getElementById('m3uFileInput');
const m3uUrlInput = document.getElementById('m3uUrlInput');
const loadUrlButton = document.getElementById('loadUrlButton');

const playlistElement = document.querySelector('#playlist ul');
const playlistContainer = document.getElementById('playlist');
const body = document.body;

const playlistToggleHandle = document.getElementById('playlist-toggle-handle');

const searchInput = document.createElement('input');
searchInput.type = 'text';
searchInput.id = 'playlist-search';
searchInput.placeholder = 'Kanal Ara...';
playlistContainer.insertBefore(searchInput, playlistElement);

let allChannelItems = [];

const scrollToTopButton = document.getElementById('scroll-to-top-button');

searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();

    allChannelItems.forEach(item => {
        const channelName = item.textContent.toLowerCase();
        if (channelName.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

scrollToTopButton.addEventListener('click', () => {
    playlistContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

playlistContainer.addEventListener('scroll', () => {
    if (playlistContainer.scrollTop > 100) { 
        scrollToTopButton.classList.add('show');
    } else {
        scrollToTopButton.classList.remove('show');
    }
});

window.addEventListener('mousemove', (event) => {
    
    if (window.innerWidth <= 768) {
     
        return; 
    }

    const mouseX = event.clientX;
    const playlistRect = playlistContainer.getBoundingClientRect();
    const toggleHandleRect = playlistToggleHandle.getBoundingClientRect();

    const isNearLeftEdge = mouseX <= 75;
    const isOverHandle = mouseX >= toggleHandleRect.left && mouseX <= toggleHandleRect.right &&
                         event.clientY >= toggleHandleRect.top && event.clientY <= toggleHandleRect.bottom;

    if (!body.classList.contains('playlist-visible') && isNearLeftEdge) {
        playlistToggleHandle.style.opacity = '1';
        playlistToggleHandle.style.pointerEvents = 'auto';
    } else if (!body.classList.contains('playlist-visible') && !isNearLeftEdge && !isOverHandle) {
         playlistToggleHandle.style.opacity = '0';
         playlistToggleHandle.style.pointerEvents = 'none';
    }
});

m3uFileInput.addEventListener('change', (event) => {
    closeUploadModal();
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        parseM3uContent(content);
    };
    reader.readAsText(file);
});

loadUrlButton.addEventListener('click', async () => {
    closeUploadModal();
    const url = m3uUrlInput.value.trim();
    if (!url) {
        console.error("Lütfen bir M3U URL'si girin.");
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.text();
        parseM3uContent(content);
    } catch (error) {
        console.error("M3U URL'si yüklenirken hata oluştu:", error);
        playlistElement.innerHTML = '';
        const listItem = document.createElement('li');
        listItem.textContent = `URL yüklenemedi: ${error.message}`;
        listItem.style.color = 'red';
        playlistElement.appendChild(listItem);
    }
});

playlistToggleHandle.addEventListener('click', () => {
    body.classList.toggle('playlist-visible');
});

const openUploadModalButton = document.getElementById('open-upload-modal-button');
const modalOverlay = document.getElementById('modal-overlay');

openUploadModalButton.addEventListener('click', () => {
    modalOverlay.classList.add('visible');
});

modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeUploadModal();
    }
});

function closeUploadModal() {
    modalOverlay.classList.remove('visible');
}

if (defaultM3uUrl) {
    console.log('Varsayılan M3U URL yükleniyor:', defaultM3uUrl);
    fetch(defaultM3uUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(content => {
            parseM3uContent(content);
            console.log('Varsayılan M3U listesi başarıyla yüklendi.');
        })
        .catch(error => {
            console.error('Varsayılan M3U URL yüklenirken hata oluştu:', error);
            playlistElement.innerHTML = '';
            const listItem = document.createElement('li');
            listItem.textContent = `Varsayılan URL yüklenemedi: ${error.message}`;
            listItem.style.color = 'red';
            playlistElement.appendChild(listItem);
        });
}

function parseM3uContent(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('#EXTINF:')) {
            const match = trimmedLine.match(/#EXTINF:(-?\d+)(.*?),(.*)/);
            if (match) {
                currentChannel = {
                    duration: parseInt(match[1], 10),
                    attributes: match[2].trim(),
                    name: match[3].trim(),
                    url: null
                };
                const groupMatch = currentChannel.attributes.match(/group-title="(.*?)"/);
                if (groupMatch) {
                    currentChannel.group = groupMatch[1];
                }
            }
        } else if (trimmedLine.startsWith('#EXTVLCOPT:')) {
            continue;
        } else if (trimmedLine && !trimmedLine.startsWith('#')) {
            if (currentChannel) {
                currentChannel.url = trimmedLine;
                channels.push(currentChannel);
                currentChannel = null;
            }
        }
    }

    displayChannels(channels);
}

function displayChannels(channels) {
    playlistElement.innerHTML = '';

    if (channels.length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = "M3U dosyasında/URL'sinde kanal bulunamadı.";
        playlistElement.appendChild(listItem);
        searchInput.value = '';
        allChannelItems = [];
        return;
    }

    allChannelItems = [];

    const groupedChannels = channels.reduce((groups, channel) => {
        const group = channel.group || 'Diğer Kanallar';
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(channel);
        return groups;
    }, {});

    let firstChannelItem = null;
    for (const group in groupedChannels) {
        if (groupedChannels.hasOwnProperty(group)) {
            const groupHeader = document.createElement('li');
            groupHeader.classList.add('group-header');
            groupHeader.textContent = group;
            playlistElement.appendChild(groupHeader);

            groupedChannels[group].forEach(channel => {
                const listItem = document.createElement('li');
                listItem.textContent = channel.name;
                listItem.dataset.url = channel.url;

                listItem.addEventListener('click', (event) => {
                    const previouslySelected = playlistElement.querySelector('li.selected');
                    if (previouslySelected) {
                        previouslySelected.classList.remove('selected');
                    }

                    event.currentTarget.classList.add('selected');

                    const urlToCopy = event.currentTarget.dataset.url;
                    if (event.shiftKey) {
                        navigator.clipboard.writeText(urlToCopy).then(() => {
                            console.log('URL panoya kopyalandı:', urlToCopy);
                            event.currentTarget.classList.add('copied');
                            setTimeout(() => {
                                event.currentTarget.classList.remove('copied');
                            }, 1000);
                        }).catch(err => {
                            console.error('URL kopyalanırken hata oluştu:', err);
                        });
                    } else {
                        playChannel(urlToCopy, false);
                    }
                });
                playlistElement.appendChild(listItem);
                allChannelItems.push(listItem);

                if (!firstChannelItem && channel.url) {
                    firstChannelItem = listItem;
                }
            });
        }
    }

    if (firstChannelItem) {
        firstChannelItem.classList.add('selected');
        playChannel(firstChannelItem.dataset.url, true);
    }
}

function playChannel(url, shouldMute = false) {
    if (player) {
        player.src({
            src: url,
            type: url.includes('.m3u8') ? 'application/x-mpegURL' :
                  (url.includes('.mpd') ? 'application/dash+xml' : 'video/mp4')
        });

        if (shouldMute) {
             player.muted(true);
        }

        if ((url.includes('.m3u8') && !videojs.Html5Hlsjs) || (url.includes('.mpd') && !videojs.Html5Dashjs)) {
             console.warn("Video.js gerekli akış desteğini bulamadı. Lütfen videojs-contrib-hls veya videojs-contrib-dash eklentilerini kontrol edin.");
        }

        player.play();
    } else {
        console.error("Video.js oynatıcı nesnesi bulunamadı.");
    }
}
