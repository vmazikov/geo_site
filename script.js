// Загружаем данные и инициализируем карту и фильтры
fetch('address.json')
  .then(response => response.json())
  .then(data => {
    let map;
    let filteredData = data;
    let technologies = [...new Set(data.map(item => item.txb))];

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
            <strong>Подъезды:</strong> ${item.entrances_in_house}
          `,
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

// Функционал выдвижного нижнего блока с "снаппингом"
// Свайп вверх – открытие на 90vh, свайп вниз – сворачивание до 20vh
// Функционал выдвижного нижнего блока с легким свайпом
document.addEventListener('DOMContentLoaded', function(){
    const sheet = document.getElementById('bottom-sheet');
    const handle = document.getElementById('sheet-handle');
    let startY, startHeightVh;
    
    // Настраиваемые параметры:
    const DRAG_SENSITIVITY = 2;  // Коэффициент усиления перемещения (увеличьте, чтобы свайп был "легче")
    const OPEN_THRESHOLD = 10;   // Изменение вверх (в vh), достаточное для открытия (90vh)
    const CLOSE_THRESHOLD = 10;  // Изменение вниз (в vh), достаточное для закрытия (20vh)
    
    handle.addEventListener('touchstart', initDrag, false);
    handle.addEventListener('mousedown', initDrag, false);
    
    function initDrag(e) {
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startHeightVh = sheet.getBoundingClientRect().height / (window.innerHeight / 100);
      document.addEventListener(e.touches ? 'touchmove' : 'mousemove', doDrag, false);
      document.addEventListener(e.touches ? 'touchend' : 'mouseup', stopDrag, false);
    }
    
    function doDrag(e) {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = startY - clientY;
      // Усиливаем смещение
      let newHeightPx = (startHeightVh * window.innerHeight / 100) + DRAG_SENSITIVITY * dy;
      let newHeightVh = newHeightPx / (window.innerHeight / 100);
      newHeightVh = Math.max(20, Math.min(newHeightVh, 90)); // Ограничение: от 20 до 90 vh
      sheet.style.height = newHeightVh + "vh";
    }
    
    function stopDrag(e) {
      const currentHeightVh = sheet.getBoundingClientRect().height / (window.innerHeight / 100);
      const diff = currentHeightVh - startHeightVh;
      
      // Если свайп вверх (увеличение высоты)
      if(diff > 0) {
        if(diff > OPEN_THRESHOLD) {
           sheet.style.height = "90vh";
        } else {
           sheet.style.height = "10vh";
        }
      }
      // Если свайп вниз (уменьшение высоты)
      else {
        if(-diff > CLOSE_THRESHOLD) {
           sheet.style.height = "20vh";
        } else {
           sheet.style.height = "10vh";
        }
      }
      document.removeEventListener(e.touches ? 'touchmove' : 'mousemove', doDrag, false);
      document.removeEventListener(e.touches ? 'touchend' : 'mouseup', stopDrag, false);
    }
  });
  