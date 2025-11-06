/* 
    Виджет для создания диаграммы Ганта, основан на библиотеке https://jsganttimproved.github.io/jsgantt-improved/
    Полная документация - https://github.com/jsGanttImproved/jsgantt-improved/blob/master/Documentation.md
    jsgantt.js — основная логика
    jsgantt.css — стили
    
    Ипользование:
    Принимает на вход:
    Не во всех столбцах должны быть данные, но для использования последующих требуется что-бы были внесены предыдущии. (Возможно стоит переписать под наименование столбцов)
        Столбцы: 
              - Плановое начало работ - (обязательный параметр) (если дата в измерении то её можно вытянуть расчетным показателем с использованием функции 0)
              - Плановое окончание работ - (обязательный параметр) 
              - Фактическое начало работ - (необязательный) 
              - Фактическое окончание работ - необязательный
              - Процент исполнения -  необязательный
              - Стоимость работ - необязательный
              - Имя ресурса - необязательный
        Строки:
              - Группа работ 1
              - Подгруппа 
              - ...
              - Подгруппа 
              - Наименование работ
*/

console.log('w', w);
const today = new Date();

// ============================
// === Подключение библиотек ===
// ============================
let elem = document.createElement('script');
elem.type = 'text/javascript';
elem.src = 'https://jsganttimproved.github.io/jsgantt-improved/dist/jsgantt.js';
// elem.src = 'https://cdn.jsdelivr.net/npm/jsgantt-improved@2.8.10/dist/jsgantt.min.js'
elem.onload = render;
document.head.append(elem);

elem = document.createElement('link');
elem.type = 'text/css';
elem.rel = "stylesheet";
elem.href = 'https://jsganttimproved.github.io/jsgantt-improved/dist/jsgantt.css';
// elem.href = '/viewer/custom/jsgantt.css';
document.head.append(elem);

// ================================
// === Promise для загрузки preview ===
// ================================
let loadHandler = null;
const loadedPromise = new Promise((resolve) => {
  loadHandler = resolve;
});
setTimeout(loadHandler, 1000);

// ============================
// === Основная функция render ===
// ============================
function render() {
  // Создаём контейнер под диаграмму
  $('#' + w.general.renderTo).append("<div style='position:relative' class='gantt' id='GanttChartDIV'></div>");
  
  // Инициализация диаграммы (интервалы отображения: 'day','week','month','quarter' и т.д.)
  const g = new JSGantt.GanttChart(document.getElementById('GanttChartDIV'), 'month');

  // =========================
  // === Настройки диаграммы ===
  // =========================
  g.setOptions({
    // vCaptionType: что показывать в подписи задачи (например, процент выполнения/ресурс/длительность)
    // Возможные значения: 'None', 'Caption', 'Resource', 'Duration', 'Complete'
    vCaptionType: 'Complete',

    // Ширина в пикселях колонки кварталов (только для формаats, где есть кварталы)
    vQuarterColWidth: 36,

    // Формат отображения даты задачи в подсказке (tooltip)
    vDateTaskDisplayFormat: 'day dd month yyyy', // пример: "Mon 01 January 2020"

    // Формат основной (major) строки дат в режиме 'Day' — обычно "месяц год - Week ww"
    vDayMajorDateDisplayFormat: 'mon yyyy - Week ww',

    // Формат второстепенной (minor) строки дат в режиме 'Week'
    vWeekMinorDateDisplayFormat: 'dd mon',

    // Локализация (если библиотека поддерживает)
    vLang: 'ru',

    // Показывать ли ссылку "Task Info" в подсказке (0/1)
    vShowTaskInfoLink: 1,

    // Показывать ли дату последнего дня недели в заголовке (только для дневного представления)
    vShowEndWeekDate: 1,

    // Порог (число ячеек на строку) для использования single-cell режима — влияет на производительность при большом объёме данных
    vUseSingleCell: 10000,

    // Доступные форматы переключения (Month, Quarter и т.д.)
    vFormatArr: ['Month', 'Quarter'],
    
    vAdditionalHeaders: { // Add data columns to your table
      delay: {
        title: 'Просрочено'
      },
      laborHoursInfo: {
        title: 'До завершения, чел.ч'
      }
    }
  });

  // =================================================
  // === 1️⃣ Формирование структуры данных myData ===
  // Преобразуем w.data.rows (пути ключей) и w.data.values в вложенный объект,
  // поддерживающий любую глубину: ['Проект','Этап','Задача'] -> myData[Проект][Этап][Задача] = { ... }
  // =================================================
  function buildMyData(w) {
    function chooseStatus(data) {
      // Преобразуем строки дат (если есть) в объекты Date
      const planStart = data.pPlanStart ? new Date(data.pPlanStart) : null;
      const planEnd = data.pPlanEnd ? new Date(data.pPlanEnd) : null;
      const realStart = data.pStart ? new Date(data.pStart) : null;
      const realEnd = data.pEnd ? new Date(data.pEnd) : null;
      
      // ✅ Завершён с нарушением срока
      if (data.perc === 100 && realEnd > planEnd) {
        return 'done whith violation';
      }
      // ✅ Завершённые задачи
      if (data.perc === 100) {
        return 'done';
      }
      // 🔵 Идёт выполнение (между плановыми датами, есть старт, но не завершено)
      if (
        (planStart && planEnd &&
        today >= planStart && today <= planEnd &&
        realStart && data.perc > 0 && data.perc < 100) ||
        today < planStart
      ) {
        return 'in progress';
      }
      
      // 🔴 Просрочено (срок истёк, а задача не завершена)
      if (planEnd && today > planEnd && !realEnd && data.perc < 100) {
        return 'overdue';
      }
  
      // 🟡 Ещё не начато (план уже стартовал, но нет начала или прогресса)
      if (
        planStart &&
        ((today > planStart) || (realStart && realStart > planStart)) &&
        !realEnd &&
        (data.perc === 0 || data.perc === null)
      ) {
        return 'procrastination';
      }
  
      // 💗 Всё остальное — неопределённое состояние
      return 'other';
    }

    const myData = {};
    const colorDic = {
      "in progress": "gtaskblue",
      "overdue": "gtaskred",
      "done": "gtaskgreen",
      "done whith violation": "gtaskgreen",
      "procrastination": "gtaskyellow",
      "other": "gtaskpink"
    };

    for (let i = 0; i < w.data.rows.length; i++) {
      // Пример: keyPath = ['Проект', 'Этап', 'Задача']
      const keyPath = w.data.rows[i];
      let currentLevel = myData;

      // Создаём или спускаемся по вложенным объектам до предпоследнего уровня
      for (let k = 0; k < keyPath.length - 1; k++) {
        const key = keyPath[k];
        if (!(key in currentLevel)) currentLevel[key] = {};
        currentLevel = currentLevel[key];
      }

      // Последний элемент пути — листовой узел: запишем объект с данными
      const lastKey = keyPath[keyPath.length - 1];
      currentLevel[lastKey] = {
        // pPlanStart/pPlanEnd — запланированные даты (показываются при включении опции показа плановых дат)
        pPlanStart: w.data.values[0][i],
        pPlanEnd: w.data.values[1][i],
        // pStart/pEnd — фактические даты начала/окончания (могут быть пустыми)
        pStart: w.data.values[2][i],
        pEnd: w.data.values[3][i],
        // perc — процент выполнения (0-100)
        perc: w.data.values[4][i],
        // cost — стоимость задачи (число)
        cost: w.data.values[5][i],
        // Плановые человеко часы
        planLaborHours: w.data.values[7][i],
        planMachineHours: w.data.values[8][i],
        planWorkHours: w.data.values[9][i] || 0,
        // Предположительно затраченные человеко часы
        presumablyWorkHours: w.data.values[10][i] || 0,
        // Осталось до завершения
        
      };
      currentLevel[lastKey].status = chooseStatus(currentLevel[lastKey]);
      currentLevel[lastKey].color = colorDic[currentLevel[lastKey].status];
      currentLevel[lastKey].delay = currentLevel[lastKey].status == "overdue" ? Math.round((new Date() - new Date(currentLevel[lastKey].pPlanStart)) / (1000 * 3600 * 24)) : 0; 
      currentLevel[lastKey].laborHoursInfo = Math.round(currentLevel[lastKey].planWorkHours * 10) / 10 + " = " +
        Math.round(currentLevel[lastKey].presumablyWorkHours * 10) / 10 + " + " +
        Math.round((currentLevel[lastKey].planWorkHours - currentLevel[lastKey].presumablyWorkHours) * 10) / 10;
    }

    return myData;
  }

  const myData = buildMyData(w);
  console.log('myData', myData);

  // ======================================================
  // === 2️⃣ Рекурсивное добавление задач в диаграмму ===
  // addTasks проходит по дереву myData и создаёт группы и задачи
  // - группа: объект без поля pStart  -> создаём pGroup:1
  // - задача: объект с полем pStart -> создаём pGroup:0
  // parentId — pID родителя (0 для верхнего уровня)
  // levelName — строка для образования уникального pID (например, 'Проект_Этап_')
  // ======================================================
function addTasks(data, parentId = 0, levelName = '') {
  let agg = {
    totalCost: 0,
    totalProgress: 0,
    totalTasks: 0,
    overdue: 0, 
    laborHourLeft: 0
  };

  for (const key in data) {
    const value = data[key];

    // --- ГРУППА ---
    if (typeof value === 'object' && !('pStart' in value)) {
      const groupId = `${levelName}${key}`;

      const childAgg = addTasks(value, groupId, groupId + '_');
      

      // 🔹 Средний прогресс по подзадачам
      const avgProgress = childAgg.totalTasks
        ? Math.round((childAgg.totalProgress / childAgg.totalTasks) * 10) / 10
        : 0;

      // 🔹 Суммарная стоимость
      const totalCost = Math.round(childAgg.totalCost * 10) / 10;
      
      const totalTasks = childAgg.totalTasks
      
      const overdue = childAgg.overdue      
      
      const laborHourLeft = childAgg.laborHourLeft

      // Добавляем саму группу в диаграмму
      g.AddTaskItemObject({
        pID: groupId,
        pName: key,
        pStart: '',
        pEnd: '',
        pPlanStart: '',
        pPlanEnd: '',
        pClass: 'ggroupblack',
        pLink: '',
        pMile: 0,
        pRes: '',
        pComp: '',
        pGroup: 1,
        pParent: parentId,
        pOpen: 0,
        pDepend: '',
        pCaption: '',
        pCost: totalCost,
        pNotes: '',
        delay: overdue+'/'+totalTasks,
        laborHoursInfo: avgProgress!==100 ? Math.round(laborHourLeft):'Завершенно'
      });

      // 🔹 Обновляем агрегаты для уровня выше
      agg.totalCost += childAgg.totalCost;
      agg.totalProgress += childAgg.totalProgress;
      agg.totalTasks += childAgg.totalTasks;

    // --- ЗАДАЧА ---
    } else if (typeof value === 'object' && 'pStart' in value) {
      const taskId = `${levelName}${key}`;
    //   console.log(taskId, agg)
      const endDate = value.pEnd ? new Date(value.pEnd) : new Date(value.pPlanEnd);

      g.AddTaskItemObject({
        pID: taskId,
        pName: key,
        pStart: value.pStart ? value.pStart + ' 00:00' : '',
        pEnd: value.pEnd ? value.pEnd + ' 23:59' : '',
        pPlanStart: value.pPlanStart || '',
        pPlanEnd: value.pPlanEnd || '',
        pClass: value.color,
        pLink: '',
        pMile: 0,
        pRes: '',
        pComp: value.perc || 0,
        pGroup: 0,
        pParent: parentId,
        pOpen: 1,
        pDepend: '',
        pCaption: '',
        pCost: value.cost,
        pNotes: '',
        delay: value.delay + ' дн.',
        laborHoursInfo: value.laborHoursInfo
      });

      // 🔹 Обновляем агрегаты
      agg.totalCost += value.cost || 0;
      agg.totalProgress += value.perc || 0;
      agg.totalTasks += 1;
      agg.overdue = value.status == "overdue" || value.status =="procrastination"?agg.overdue+1:agg.overdue
      agg.laborHourLeft += value.planWorkHours - value.presumablyWorkHours
    }
  }

  return agg; // 👈 возвращаем агрегированные результаты вверх по дереву
}


  // ==========================================
  // === 3️⃣ Отрисовываем всю структуру ===
  // ==========================================
  addTasks(myData);
  
  // ================================
  // === Дополнительные параметры ===
  // ================================
  // Показывать/скрывать колонки и элементы подсказки:
  g.setShowTaskInfoRes(0);      // Показывать ресурс в подсказке (1/0)
  g.setShowTaskInfoNotes(0);    // Показывать заметки в подсказке (1/0)
  g.setShowRes(0);              // 
  // Параметры показа плановых дат (если у задач заполнены pPlanStart/pPlanEnd)
  g.setShowPlanStartDate(1);    // Показывать колонку планового начала (1/0)
  g.setShowPlanEndDate(1);      // Показывать колонку планового окончания (1/0)
  g.setShowStartDate(0);        // Показывать колонку планового начала (1/0)
  g.setShowEndDate(0);          // Показывать колонку планового окончания (1/0)
  g.setShowCost(1);             // Включить отображение стоимости
  g.setShowComp(0);             // Включить отображение стоимости

  // Высота / размеры:
  g.setTotalHeight('900px');    // Полная высота диаграммы (можно подставлять динамически)
  g.setMonthColWidth(60);       // Ширина колонки месяца в пикселях
  g.setRowHeight(60);           // Высота строки (позволяет больше/меньше пространства для бара)

  // Порядок колонок в таблице слева (см. документацию JSGantt)
  g.setColumnOrder([
    'vShowStartDate',
    'vShowEndDate',
    'vShowPlanStartDate',
    'vShowPlanEndDate',
    'vShowRes',
    'vShowDur',
    'vShowComp',
    'vShowCost',
    'vAdditionalHeaders',
    'vShowAddEntries'
  ]);
  
  // Финальная отрисовка графика
  g.Draw();

  // Немного стилей на левую панель (по желанию)
  $('.gmainleft').css('flex-basis', '50%');
}

// ================================
// === Возвращаем promise загрузки ===
// ================================
({
  isLoaded: function () {
    return loadedPromise;
  }
