let map;
let data = [];              // ← Глобальный массив всех домов
let filteredData = [];      // ← Массив после фильтрации
let technologies = [];      // ← Массив технологий

// создаём оверлей-панельку:
const overlay = document.createElement('div');
overlay.id = 'mode-overlay';
overlay.innerHTML = `
  <div>
    <h3>Выбрано домов: <span id="ov-house-count">0</span></h3>
    <p>Подъездов: <span id="ov-entrances-count">0</span></p>
    <p>Квартир: <span id="ov-apartments-count">0</span></p>
    <button class="finish-btn">Завершить</button>
  </div>
`;
document.body.append(overlay);
(function(){
  // …ваши переменные и функции…

  // Инициализация UI-кнопок внутри этого замыкания:
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#mode-overlay .finish-btn')
      .addEventListener('click', () => setMode('normal'));
    document.querySelectorAll('#mode-controls .mode-btn')
      .forEach(btn => btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
        // при переключении режима скрываем нижнюю шторку
        document.getElementById('bottom-sheet')
          .classList.add('collapsed');
      }));
  });

  // …остальной код IIFE…
})();


// Загружаем данные и инициализируем карту и фильтры
fetch('address.json')
  .then(response => response.json())
  .then(data => {
    data = data;                      // ← Заполняем глобальную data
    filteredData = data.slice();      // ← Изначально без фильтрации
    technologies = [...new Set(data.map(item => item.txb))];
    function init() {
      map = new ymaps.Map("map", {
        center: [56.091522, 86.069079],
        zoom: 12
      });
      map.container.getElement().style.cursor = 'pointer';

      populateCityFilter(data);
      populateTechnologyFilter(technologies);
    }

    function populateCityFilter(data) {
      const cities = Array.from(new Set(data.map(item => item.city_with_full_type)));
      const citySelect = document.getElementById('city');
      cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
      });

      // При выборе города фильтруем данные, обновляем районы, применяем фильтры и центрируем карту
      citySelect.addEventListener('change', function() {
        const city = citySelect.value;
        filteredData = data.filter(item => item.city_with_full_type === city);
        updateDistrictFilter(filteredData);
        applyFilters();
        if (filteredData.length > 0) {
          // Центрируем карту на координатах первого элемента (приводим к числам)
          map.setCenter([+filteredData[0].geo_lat, +filteredData[0].geo_lon]);
        }
      });
    }

    function populateTechnologyFilter(technologies) {
      const techContainer = document.getElementById('technology');
      technologies.forEach(tech => {
        const label = document.createElement('label');
        label.textContent = tech;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tech;
        checkbox.checked = true;
        label.appendChild(checkbox);
        techContainer.appendChild(label);
      });
      techContainer.addEventListener('change', applyFilters);
    }

    function updateDistrictFilter(filteredData) {
      const districtSelect = document.getElementById('district');
      const districts = Array.from(new Set(filteredData.map(item => item.district)));
      districtSelect.innerHTML = '<option value="">Все</option>';
      districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district || "Без района";
        districtSelect.appendChild(option);
      });

      districtSelect.addEventListener('change', function() {
        const district = districtSelect.value;
        filteredData = data.filter(item =>
          (item.city_with_full_type === document.getElementById('city').value) &&
          (district ? item.district === district : true)
        );
        applyFilters();
      });
    }

    document.getElementById('apply-filters').addEventListener('click', applyFilters);

    function applyFilters() {
      const citySelect = document.getElementById('city');
      const districtSelect = document.getElementById('district');
      const yearFrom = document.getElementById('year-from').value;
      const yearTo = document.getElementById('year-to').value;
      const freePortsFrom = document.getElementById('free-ports-from').value;
      const freePortsTo = document.getElementById('free-ports-to').value;
      const busyPortsFrom = document.getElementById('busy-ports-from').value;
      const busyPortsTo = document.getElementById('busy-ports-to').value;
      const floorsFrom = document.getElementById('floors-from').value;
      const floorsTo = document.getElementById('floors-to').value;
      const entrancesFrom = document.getElementById('entrances-from').value;
      const entrancesTo = document.getElementById('entrances-to').value;

      const selectedTechnologies = Array.from(document.querySelectorAll('#technology input:checked'))
        .map(input => input.value);

      filteredData = data.filter(item => {
        return (
          (!yearFrom || item.year >= yearFrom) &&
          (!yearTo || item.year <= yearTo) &&
          (!freePortsFrom || item.free_ports >= freePortsFrom) &&
          (!freePortsTo || item.free_ports <= freePortsTo) &&
          (!busyPortsFrom || item.busy_ports >= busyPortsFrom) &&
          (!busyPortsTo || item.busy_ports <= busyPortsTo) &&
          (!floorsFrom || item.floors_in_house >= floorsFrom) &&
          (!floorsTo || item.floors_in_house <= floorsTo) &&
          (!entrancesFrom || item.entrances_in_house >= entrancesFrom) &&
          (!entrancesTo || item.entrances_in_house <= entrancesTo) &&
          (selectedTechnologies.includes(item.txb)) &&
          (item.city_with_full_type === citySelect.value) &&
          (districtSelect.value === "" || item.district === districtSelect.value)
        );
      });

      document.getElementById('bottom-sheet')
      .classList.add('collapsed');
      updateMap(filteredData);
      updateHeader(filteredData);
    }

    function updateMap(filteredData) {
      map.geoObjects.removeAll();
      filteredData.forEach(item => {
        const iconColor = item.txb === 'GPON' ? '#2795f4' : item.txb === 'FTTB' ? '#e877ce' : '#000000';
        const placemark = new ymaps.Placemark([item.geo_lat, item.geo_lon], {
          balloonContent: `
            <strong>Город:</strong> ${item.city_with_full_type}<br>
            <strong>Улица:</strong> ${item.street} ${item.house}<br>
            <strong>Год:</strong> ${item.year}<br>
            <strong>Свободные порты:</strong> ${item.free_ports}<br>
            <strong>Занятые порты:</strong> ${item.busy_ports}<br>
            <strong>Этажи:</strong> ${item.floors_in_house}<br>
            <strong>Подъезды:</strong> ${item.entrances_in_house}<br>
            <strong>Квартиры:</strong> ${item.apartments_in_house}
          `,
          objectData: item 
        }, {
          iconColor: iconColor
        });
        map.geoObjects.add(placemark);
      });
    }

    function updateHeader(filteredData) {
      document.getElementById('city-name').textContent = document.getElementById('city').value;
      document.getElementById('district-name').textContent = document.getElementById('district').value;
      document.getElementById('house-count').textContent = filteredData.length;
      document.getElementById('entrances-count').textContent = filteredData.reduce((sum, item) => sum + parseInt(item.entrances_in_house), 0);
      document.getElementById('apartments-count').textContent = filteredData.reduce((sum, item) => sum + parseInt(item.apartments_in_house), 0);
    }

    ymaps.ready(init);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const sheet     = document.getElementById('bottom-sheet');
    const toggleBtn = document.getElementById('toggle-sheet');
  
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = sheet.classList.toggle('expanded');
      sheet.classList.toggle('collapsed');
      toggleBtn.textContent = isCollapsed
        ? 'Свернуть фильтры'
        : 'Показать фильтры';
    });
  });

  


  // selection.js
(function(){
  let mode = 'normal';
  const selectedPlacemarks = new Set();
  let drawCoords = [];
  let drawPolygon = null;

  // --- Подсчёт и обновление шапки ---
  function updateCounts(items) {
    const totalHouses     = items.length;
    const totalEntrances  = items.reduce((sum,i) => sum + Number(i.entrances_in_house), 0);
    const totalApartments = items.reduce((sum,i) => sum + Number(i.apartments_in_house), 0);
    document.getElementById('house-count').textContent      = totalHouses;
    document.getElementById('entrances-count').textContent = totalEntrances;
    document.getElementById('apartments-count').textContent= totalApartments;
  }

  // --- Режим SELECT: клик по иконкам ---
  function initSelect() {
    overlay.classList.add('visible');
    map.geoObjects.each(pm => {
      pm.options.set('openBalloonOnClick', false);
      pm.events.add('click', onSelectClick);
    });
  }
  
  function teardownSelect() {
    overlay.classList.remove('visible');
    map.geoObjects.each(pm => {
      pm.events.remove('click', onSelectClick);
      pm.options.unset('preset');
      pm.options.set('openBalloonOnClick', true);
    });
    selectedPlacemarks.clear();
  }
  

  function onSelectClick(e) {
    const pm  = e.get('target');
    const obj = pm.properties.get('objectData');
    if (!obj) return;
  
    if (selectedPlacemarks.has(obj)) {
      selectedPlacemarks.delete(obj);
      pm.options.set('preset', 'islands#blueDotIcon');
    } else {
      selectedPlacemarks.add(obj);
      pm.options.set('preset', 'islands#greenCircleDotIcon');
    }
  
    updateCounts(Array.from(selectedPlacemarks));
  }

  // --- Режим DRAW: обводка полигона ---
  function initDraw() {
    overlay.classList.add('visible');
    map.container.getElement().style.cursor = 'crosshair';
    map.events.add('click', onMapClick);
    addFinishButton();
  }
  function teardownDraw() {
    overlay.classList.remove('visible');
    map.container.getElement().style.cursor = '';
    map.events.remove('click', onMapClick);
    removeFinishButton();
    if (drawPolygon) {
      map.geoObjects.remove(drawPolygon);
      drawPolygon = null;
    }
    drawCoords = [];
  }
  function onMapClick(e) {
    const coord = e.get('coords');
    drawCoords.push(coord);
    if (drawPolygon) {
      map.geoObjects.remove(drawPolygon);
    }
    if (drawCoords.length > 2) {
      drawPolygon = new ymaps.Polygon([drawCoords], {}, {
        strokeColor: '#FF0000',
        fillColor:   'rgba(255,0,0,0.3)',
        strokeWidth: 2
      });
      map.geoObjects.add(drawPolygon);
    }
  }
  function addFinishButton() {
    if (document.getElementById('finish-draw')) return;
    const btn = document.createElement('button');
    btn.id = 'finish-draw';
    btn.textContent = 'Завершить обводку';
    Object.assign(btn.style, {
      position: 'absolute', top: '10px', right: '10px', zIndex: 2000,
      padding: '8px 12px', background: '#2795f4', color: '#fff', border: 'none'
    });
    document.body.append(btn);
    btn.addEventListener('click', finishDraw);
  }
  function removeFinishButton() {
    const btn = document.getElementById('finish-draw');
    if (btn) btn.remove();
  }
  function finishDraw() {
    const inside = data.filter(item =>
      drawPolygon.geometry.contains([+item.geo_lat, +item.geo_lon])
    );
    updateCounts(inside);
    // скрываем оверлей
    overlay.classList.remove('visible');
    // возвращаем нормальный режим и прячем шторку
    setMode('normal');
  }

  // --- Режимы и переключение ---
  function teardownMode() {
    if (mode === 'select') teardownSelect();
    if (mode === 'draw')   teardownDraw();
  }
  function initMode() {
    if (mode === 'select') initSelect();
    if (mode === 'draw')   initDraw();
  }
  function setMode(newMode) {
    teardownMode();
    mode = newMode;
    initMode();
    // прячем шторку при любом переключении режима
    document.getElementById('bottom-sheet').classList.add('collapsed');
  }

  // --- Инициализация UI-кнопок ---
  document.addEventListener('DOMContentLoaded', () => {
    const controls = document.getElementById('mode-controls');
    if (!controls) return;
    controls.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
    // стартовый режим
    setMode('normal');
  });

  // --- Ждём готовности карты и существующих placemarks ---
  ymaps.ready(() => {
    // В случае, если кнопки создаются только после map.init, повторим инициализацию
    const controls = document.getElementById('mode-controls');
    if (controls) setMode('normal');
  });
})();
