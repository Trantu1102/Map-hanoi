const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

const img = document.querySelector('.map-container img');
canvas.width = img.clientWidth;
canvas.height = img.clientHeight;

const mapElement = document.getElementById('hanoi-map');

let areas = [];
let locationsData = [];

fetch('provinces.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Thay đổi để lấy dữ liệu từ hanoi_districts
        locationsData = data.hanoi_districts;
        areas = locationsData.map(location => {
            if (!location.coords) {
                console.error('Missing coords for location:', location);
                return { coords: [], shape: 'poly' };
            }
            const coords = location.coords.split(',').map(Number);
            const shape = 'poly';
            return { coords, shape };
        });
        createMapAreas();
    })
    .catch(error => {
        console.error('Error loading the JSON file:', error);
    });

function updateCanvasSize() {
    // Cập nhật kích thước canvas theo kích thước thực của ảnh
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
    canvas.style.width = `${img.offsetWidth}px`;
    canvas.style.height = `${img.offsetHeight}px`;
}

// Sửa lại event listener resize
window.addEventListener('resize', () => {
    updateCanvasSize();
    createMapAreas();
});

// Thêm vào sau khi ảnh đã load
img.addEventListener('load', () => {
    updateCanvasSize();
    createMapAreas();
});

// Sửa lại hàm createMapAreas
function createMapAreas() {
    mapElement.innerHTML = '';
    const scaleX = img.offsetWidth / img.naturalWidth;
    const scaleY = img.offsetHeight / img.naturalHeight;
    
    areas.forEach((area) => {
        const scaledCoords = area.coords.map((val, index) => {
            return index % 2 === 0 
                ? Math.round(val * scaleX) 
                : Math.round(val * scaleY);
        });
        
        const areaElement = document.createElement('area');
        areaElement.setAttribute('shape', area.shape);
        areaElement.setAttribute('coords', scaledCoords.join(','));
        areaElement.setAttribute('href', 'javascript:void(0)');
        mapElement.appendChild(areaElement);
    });
    
    setupEventListeners();
}

const drawOutline = (coords) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    
    ctx.moveTo(coords[0] * scaleX, coords[1] * scaleY);
    for (let i = 2; i < coords.length; i += 2) {
        ctx.lineTo(coords[i] * scaleX, coords[i + 1] * scaleY);
    }
    
    ctx.closePath();
    
    // Thêm fill màu da cam nhạt
    ctx.fillStyle = 'rgba(255, 165, 0, 0.3)'; // Màu da cam với độ trong suốt 0.3
    ctx.fill();
    
    // Vẽ viền đỏ
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
};

const clearOutline = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// Tooltip functionality
const tooltip = document.querySelector('.tooltip-box');

const showTooltip = (data, event) => {
    tooltip.style.display = 'block';

    // Kiểm tra nếu là huyện
    const isHuyen = data.name.includes('Huyện');
    const currentWardsList = data.current_wards.list;
    const futureWardsList = isHuyen ? 
        data.future_wards.list.map(ward => `Xã ${ward}`) :
        data.future_wards.list;

    tooltip.innerHTML = `
        <h2>${data.name}</h2>
        <div class="current-wards">
            <h3>
                PHƯỜNG, XÃ HIỆN TẠI 
                <span class="ward-count">${data.current_wards.total}</span>
            </h3>
            <p class="ward-list">${currentWardsList.join(' • ')}</p>
        </div>
        <div class="future-wards">
            <h3>
                PHƯỜNG, XÃ SAU SẮP XẾP 
                <span class="ward-count">${data.future_wards.total}</span>
                <span class="reduction-badge">Giảm ${data.current_wards.total - data.future_wards.total} phường</span>
            </h3>
            <p class="ward-list highlight">${futureWardsList.join(' • ')}</p>
        </div>
    `;

    // Hiện tooltip trước để lấy kích thước thực
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Lấy kích thước và vị trí của viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Tính toán vị trí tốt nhất cho tooltip
    let left = event.pageX + 10;
    let top = event.pageY + 10;

    // Kiểm tra và điều chỉnh vị trí ngang
    if (left + tooltipWidth > viewportWidth + scrollLeft) {
        left = event.pageX - tooltipWidth - 10;
    }

    // Kiểm tra và điều chỉnh vị trí dọc
    if (top + tooltipHeight > viewportHeight + scrollTop) {
        top = event.pageY - tooltipHeight - 10;
        
        // Nếu vẫn vượt quá phía trên viewport
        if (top < scrollTop) {
            // Đặt tooltip ở giữa màn hình theo chiều dọc
            top = scrollTop + (viewportHeight - tooltipHeight) / 2;
        }
    }

    // Đảm bảo tooltip không bị cắt ở các cạnh
    left = Math.max(scrollLeft + 10, Math.min(left, viewportWidth + scrollLeft - tooltipWidth - 10));
    top = Math.max(scrollTop + 10, Math.min(top, viewportHeight + scrollTop - tooltipHeight - 10));

    // Áp dụng vị trí và hiện tooltip
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = 'visible';
    tooltip.classList.add('active');
};

// Thêm event listener cho viewport resize
window.addEventListener('resize', () => {
    if (tooltip.classList.contains('active')) {
        tooltip.classList.remove('active');
    }
});

const hideTooltip = () => {
    tooltip.classList.remove('active');
};

function setupEventListeners() {
    document.querySelectorAll('area').forEach((area, index) => {
        area.addEventListener('mouseenter', () => {
            drawOutline(areas[index].coords);
        });
        area.addEventListener('mouseleave', clearOutline);

        area.addEventListener('mouseenter', (event) => {
            showTooltip(locationsData[index], event);
        });
        area.addEventListener('mousemove', (event) => {
            // Chỉ cập nhật vị trí nếu tooltip không bị overflow
            const tooltipRect = tooltip.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Chỉ di chuyển tooltip theo chuột khi có đủ không gian
            if (tooltipRect.width + event.clientX < viewportWidth &&
                tooltipRect.height + event.clientY < viewportHeight) {
                tooltip.style.left = `${event.pageX + 10}px`;
                tooltip.style.top = `${event.pageY + 10}px`;
            }
        });
        area.addEventListener('mouseleave', hideTooltip);
    });

    document.addEventListener('mousemove', (event) => {
        if (!event.target.closest('area') && !tooltip.contains(event.target)) {
            tooltip.style.display = 'none';
            tooltip.innerHTML = '';
        }
    });
}