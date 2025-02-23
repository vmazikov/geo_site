// Загружаем данные из файла
fetch('address.json')
  .then(response => response.json())
  .then(data => {
    // Инициализируем переменные
    let map;
    let filteredData = data;
    let technologies = [...new Set(data.map(item => item.txb))]; // Уникальные технологии

    // Функция инициализации карты
    function init() {
        map = new ymaps.Map("map", {
            center: [56.091522, 86.069079], // Default center
            zoom: 12
        });
        map.container.getElement().style.cursor = 'pointer'; // Убираем курсор

        // Заполнение фильтров
        populateCityFilter(data);
        populateTechnologyFilter(technologies);

        // Не заполняем карту сразу, она будет пустой
    }

    // Заполнение фильтра города
    function populateCityFilter(data) {
        const cities = Array.from(new Set(data.map(item => item.city_with_full_type)));
        const citySelect = document.getElementById('city');
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });

        // После выбора города фильтровать данные по выбранному городу
        citySelect.addEventListener('change', function() {
            const city = citySelect.value;
            filteredData = data.filter(item => item.city_with_full_type === city);
            updateDistrictFilter(filteredData);
            applyFilters();
        });
    }

    // Заполнение фильтра технологий
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

        // Обработчик для чекбоксов
        techContainer.addEventListener('change', applyFilters);
    }

    // Заполнение фильтра районов
    function updateDistrictFilter(filteredData) {
        const districtSelect = document.getElementById('district');
        const districts = Array.from(new Set(filteredData.map(item => item.district)));

        // Очищаем предыдущие значения
        districtSelect.innerHTML = '<option value="">Все</option>';

        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district || "Без района";
            districtSelect.appendChild(option);
        });

        // После выбора района фильтровать данные по выбранному району
        districtSelect.addEventListener('change', function() {
            const district = districtSelect.value;
            filteredData = data.filter(item => 
                (item.city_with_full_type === document.getElementById('city').value) &&
                (district ? item.district === district : true)
            );
            applyFilters();
        });
    }

    // Применение фильтров
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

        // Собираем выбранные технологии
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

        // Теперь отрисовываем карту и обновляем статистику
        updateMap(filteredData);
        updateHeader(filteredData);
    }

    // Обновление карты с фильтрованными домами
    function updateMap(filteredData) {
        // Удаляем старые метки
        map.geoObjects.removeAll();

        // Добавляем новые метки
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

    // Обновление статистики
    function updateHeader(filteredData) {
        document.getElementById('city-name').textContent = document.getElementById('city').value;
        document.getElementById('district-name').textContent = document.getElementById('district').value;
        document.getElementById('house-count').textContent = filteredData.length;
        document.getElementById('entrances-count').textContent = filteredData.reduce((sum, item) => sum + parseInt(item.entrances_in_house), 0);
        document.getElementById('apartments-count').textContent = filteredData.reduce((sum, item) => sum + parseInt(item.apartments_in_house), 0);
    }

    // Инициализация карты
    ymaps.ready(init);
});
