export interface TemplateParameter {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface ProposalTemplate {
  id: string;
  category: string;
  type: string;
  titleTemplate: string;
  descriptionTemplate: string;
  tags: string[];
  parameters: TemplateParameter[];
}

export const TEMPLATES: ProposalTemplate[] = [
  {
    id: "tos-create",
    category: "Территориальное самоуправление",
    type: "Создание ТОС",
    titleTemplate: "Создание ТОС «{name}» на территории {address}",
    descriptionTemplate: `Предлагается создать Территориальное общественное самоуправление (ТОС) «{name}» на территории по адресу: {address}.

**Инициативная группа:** {initiative_group}
**Цель создания:** {goal}

**Основные направления деятельности:**
{activities}

Приглашаем всех жителей данной территории принять участие в собрании и поддержать создание ТОС.`,
    tags: ["тос", "самоуправление", "территория", "инициатива"],
    parameters: [
      {
        name: "name",
        label: "Название ТОС",
        type: "text",
        required: true,
        placeholder: "Например: «Наш двор»",
      },
      {
        name: "address",
        label: "Адрес территории",
        type: "text",
        required: true,
        placeholder: "Улица, дом, район",
      },
      {
        name: "initiative_group",
        label: "Инициативная группа",
        type: "text",
        required: true,
        placeholder: "Адрес мультикошелька или список адресов кошельков",
      },
      {
        name: "goal",
        label: "Цель создания",
        type: "select",
        required: true,
        options: [
          "Благоустройство территории",
          "Организация досуга",
          "Решение коммунальных вопросов",
          "Повышение безопасности",
          "Комплексное развитие",
        ],
        placeholder: "Основная цель",
      },
      {
        name: "activities",
        label: "Основные направления деятельности",
        type: "textarea",
        required: false,
        placeholder: "Краткое описание планируемых мероприятий",
      },
    ],
  },
  {
    id: "tos-council",
    category: "Территориальное самоуправление",
    type: "Создание Совета дома",
    titleTemplate: "Создание Совета многоквартирного дома по адресу {address}",
    descriptionTemplate: `Предлагается создать Совет многоквартирного дома по адресу: {address}.

**Председатель:** {chairman}
**Состав совета:** {members}
**Срок полномочий:** {term}

**Основные задачи:**
{tasks}

Совет дома будет представлять интересы жильцов во взаимодействии с управляющей компанией и органами власти.`,
    tags: ["совет_дома", "мкд", "жкх", "управление"],
    parameters: [
      {
        name: "address",
        label: "Адрес дома",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "chairman",
        label: "Председатель",
        type: "text",
        required: true,
        placeholder: "Адрес кошелька председателя",
      },
      {
        name: "members",
        label: "Состав совета",
        type: "textarea",
        required: true,
        placeholder: "Адрес мультикошелька членов совета",
      },
      {
        name: "term",
        label: "Срок полномочий",
        type: "select",
        required: true,
        options: ["1 год", "2 года", "3 года", "5 лет"],
      },
      {
        name: "tasks",
        label: "Основные задачи",
        type: "textarea",
        required: false,
        placeholder: "Перечень основных задач",
      },
    ],
  },
  {
    id: "greening-yard",
    category: "Благоустройство двора",
    type: "Озеленение двора",
    titleTemplate: "Озеленение двора по адресу {address}",
    descriptionTemplate: `Предлагается провести озеленение дворовой территории по адресу: {address}.

**Тип озеленения:** {greening_type}
**Площадь:** {area}
**Предполагаемые растения/элементы:** {plants}

Данная инициатива направлена на улучшение экологической обстановки и повышение комфорта проживания жителей.`,
    tags: ["озеленение", "двор", "растения", "экология"],
    parameters: [
      {
        name: "address",
        label: "Адрес двора",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "greening_type",
        label: "Тип озеленения",
        type: "select",
        required: true,
        options: [
          "Клумбы и цветники",
          "Посадка деревьев",
          "Газон",
          "Живая изгородь",
          "Смешанный",
          "Вертикальное озеленение",
        ],
      },
      {
        name: "area",
        label: "Площадь (м²)",
        type: "text",
        required: true,
        placeholder: "Ориентировочная площадь",
      },
      {
        name: "plants",
        label: "Предполагаемые растения/элементы",
        type: "textarea",
        required: false,
        placeholder: "Какие растения, кустарники, деревья планируется высадить",
      },
    ],
  },
  {
    id: "playground",
    category: "Благоустройство двора",
    type: "Установка детской площадки",
    titleTemplate: "Установка детской игровой площадки по адресу {address}",
    descriptionTemplate: `Предлагается установить детскую игровую площадку по адресу: {address}.

**Возрастная группа:** {age_group}
**Тип покрытия:** {covering}
**Перечень оборудования:** {equipment}

Площадка предназначена для детей возрастом {age_group}. Установка площадки позволит создать безопасное и развивающее пространство для детей.`,
    tags: ["детская_площадка", "двор", "дети", "благоустройство"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "age_group",
        label: "Возрастная группа",
        type: "select",
        required: true,
        options: [
          "1–3 года",
          "3–7 лет",
          "7–12 лет",
          "3–12 лет",
          "0+ (все возраста)",
        ],
      },
      {
        name: "covering",
        label: "Тип покрытия",
        type: "select",
        required: true,
        options: [
          "Резиновое (резиновая крошка)",
          "Песок",
          "Искусственный газон",
          "Деревянный настил",
          "Комбинированное",
        ],
      },
      {
        name: "equipment",
        label: "Перечень оборудования",
        type: "textarea",
        required: true,
        placeholder:
          "Горка, качели, карусель, песочница, спортивный комплекс и т.д.",
      },
    ],
  },
  {
    id: "sports-ground",
    category: "Благоустройство двора",
    type: "Создание спортивной площадки",
    titleTemplate: "Создание спортивной площадки по адресу {address}",
    descriptionTemplate: `Предлагается создать спортивную площадку по адресу: {address}.

**Вид спорта:** {sport_type}
**Тип покрытия:** {covering}
**Размер площадки:** {size}
**Оборудование:** {equipment}

Создание спортивной площадки будет способствовать популяризации здорового образа жизни и организации досуга жителей.`,
    tags: ["спорт", "площадка", "зож", "двор"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "sport_type",
        label: "Вид спорта",
        type: "select",
        required: true,
        options: [
          "Воркаут",
          "Футбол",
          "Баскетбол",
          "Волейбол",
          "Теннис",
          "Универсальная",
          "Стритбол",
        ],
      },
      {
        name: "covering",
        label: "Тип покрытия",
        type: "select",
        required: true,
        options: [
          "Резиновое",
          "Газон",
          "Асфальт",
          "Плитка",
          "Специальное спортивное",
        ],
      },
      {
        name: "size",
        label: "Размер площадки",
        type: "text",
        required: false,
        placeholder: "Например: 15×30 м",
      },
      {
        name: "equipment",
        label: "Оборудование",
        type: "textarea",
        required: false,
        placeholder: "Ворота, кольца, турники, скамейки и т.д.",
      },
    ],
  },
  {
    id: "rest-area",
    category: "Благоустройство двора",
    type: "Обустройство зоны отдыха",
    titleTemplate: "Обустройство зоны отдыха по адресу {address}",
    descriptionTemplate: `Предлагается обустроить зону отдыха по адресу: {address}.

**Тип зоны отдыха:** {rest_type}
**Количество мест:** {seats}
**Дополнительное оснащение:** {extras}

Зона отдыха станет местом притяжения жителей для общения и проведения досуга на свежем воздухе.`,
    tags: ["отдых", "двор", "скамейки", "благоустройство"],
    parameters: [
      {
        name: "address",
        label: "Адрес",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "rest_type",
        label: "Тип зоны отдыха",
        type: "select",
        required: true,
        options: [
          "Скамейки и столы",
          "Беседка",
          "Мангальная зона",
          "Танцевальная площадка",
          "Летняя веранда",
        ],
      },
      {
        name: "seats",
        label: "Количество мест",
        type: "text",
        required: true,
        placeholder: "Ориентировочное количество",
      },
      {
        name: "extras",
        label: "Дополнительное оснащение",
        type: "textarea",
        required: false,
        placeholder: "Освещение, урны, клумбы, навес и т.д.",
      },
    ],
  },
  {
    id: "parking",
    category: "Благоустройство двора",
    type: "Организация парковки",
    titleTemplate: "Организация парковки по адресу {address}",
    descriptionTemplate: `Предлагается организовать парковку по адресу: {address}.

**Тип парковки:** {parking_type}
**Количество мест:** {spots}
**Тип покрытия:** {covering}
**Дополнительно:** {extras}

Организация парковки позволит упорядочить стоянку транспортных средств и разгрузить внутридворовые проезды.`,
    tags: ["парковка", "машина", "двор", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "parking_type",
        label: "Тип парковки",
        type: "select",
        required: true,
        options: [
          "Гостевая",
          "Постоянная",
          "Велосипедная",
          "Для инвалидов",
          "Электрозарядная",
        ],
      },
      {
        name: "spots",
        label: "Количество мест",
        type: "text",
        required: true,
        placeholder: "Количество машино-мест",
      },
      {
        name: "covering",
        label: "Тип покрытия",
        type: "select",
        required: true,
        options: ["Асфальт", "Плитка", "Газонная решётка", "Щебень", "Бетон"],
      },
      {
        name: "extras",
        label: "Дополнительно",
        type: "textarea",
        required: false,
        placeholder: "Шлагбаум, освещение, разметка, знаки",
      },
    ],
  },
  {
    id: "lighting-install",
    category: "Освещение",
    type: "Установка освещения",
    titleTemplate: "Установка освещения по адресу {address}",
    descriptionTemplate: `Предлагается установить освещение по адресу: {address}.

**Тип освещения:** {lighting_type}
**Количество опор:** {poles}
**Зона освещения:** {zone}

Установка освещения повысит безопасность и комфорт передвижения в тёмное время суток.`,
    tags: ["освещение", "свет", "безопасность", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес территории",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома, участок",
      },
      {
        name: "lighting_type",
        label: "Тип освещения",
        type: "select",
        required: true,
        options: [
          "Светодиодное",
          "На солнечных батареях",
          "Обычное",
          "Декоративное",
          "Прожекторное",
        ],
      },
      {
        name: "poles",
        label: "Количество опор",
        type: "text",
        required: true,
        placeholder: "Количество столбов освещения",
      },
      {
        name: "zone",
        label: "Зона освещения",
        type: "text",
        required: false,
        placeholder: "Двор, улица, парк, подъезд и т.д.",
      },
    ],
  },
  {
    id: "road-repair",
    category: "Дорожное хозяйство",
    type: "Ремонт дороги",
    titleTemplate: "Ремонт дорожного покрытия на участке {address}",
    descriptionTemplate: `Предлагается провести ремонт дорожного покрытия на участке: {address}.

**Тип покрытия:** {covering}
**Протяжённость:** {length}
**Ширина:** {width}
**Характер работ:** {work_type}

Ремонт необходим для обеспечения безопасного и комфортного передвижения транспорта и пешеходов.`,
    tags: ["дорога", "ремонт", "покрытие", "транспорт"],
    parameters: [
      {
        name: "address",
        label: "Адрес участка",
        type: "text",
        required: true,
        placeholder: "От дома № до дома № или ориентир",
      },
      {
        name: "covering",
        label: "Тип покрытия",
        type: "select",
        required: true,
        options: ["Асфальт", "Плитка", "Щебень", "Бетон", "Грунт"],
      },
      {
        name: "length",
        label: "Протяжённость",
        type: "text",
        required: true,
        placeholder: "метров",
      },
      {
        name: "width",
        label: "Ширина",
        type: "text",
        required: false,
        placeholder: "метров",
      },
      {
        name: "work_type",
        label: "Характер работ",
        type: "select",
        required: true,
        options: [
          "Ямочный ремонт",
          "Капитальный ремонт",
          "Замена покрытия",
          "Расширение проезжей части",
        ],
      },
    ],
  },
  {
    id: "sidewalk",
    category: "Дорожное хозяйство",
    type: "Обустройство тротуара",
    titleTemplate: "Обустройство тротуара по адресу {address}",
    descriptionTemplate: `Предлагается обустроить тротуар по адресу: {address}.

**Длина тротуара:** {length}
**Ширина тротуара:** {width}
**Тип покрытия:** {covering}

Обустройство тротуара обеспечит безопасное и комфортное передвижение пешеходов, в том числе маломобильных групп населения.`,
    tags: ["тротуар", "пешеход", "безопасность", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес участка",
        type: "text",
        required: true,
        placeholder: "Улица, участок",
      },
      {
        name: "length",
        label: "Длина",
        type: "text",
        required: true,
        placeholder: "метров",
      },
      {
        name: "width",
        label: "Ширина",
        type: "text",
        required: true,
        placeholder: "метров",
      },
      {
        name: "covering",
        label: "Тип покрытия",
        type: "select",
        required: true,
        options: ["Асфальт", "Плитка", "Бетон", "Резиновая плитка"],
      },
    ],
  },
  {
    id: "speed-bump",
    category: "Дорожное хозяйство",
    type: "Установка «лежачего полицейского»",
    titleTemplate: "Установка искусственной неровности по адресу {address}",
    descriptionTemplate: `Предлагается установить искусственную дорожную неровность по адресу: {address}.

**Тип неровности:** {type}
**Количество:** {count}

Установка необходима для принудительного ограничения скорости движения транспортных средств и повышения безопасности пешеходов.`,
    tags: ["безопасность", "дорога", "лп", "пешеход"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        type: "text",
        required: true,
        placeholder: "Улица, участок",
      },
      {
        name: "type",
        label: "Тип неровности",
        type: "select",
        required: true,
        options: ["Резиновая", "Пластиковая", "Асфальтовая", "Сборная"],
      },
      {
        name: "count",
        label: "Количество",
        type: "text",
        required: true,
        placeholder: "1, 2, 3...",
      },
    ],
  },
  {
    id: "trash-area",
    category: "Экология и чистота",
    type: "Обустройство контейнерной площадки",
    titleTemplate: "Обустройство контейнерной площадки по адресу {address}",
    descriptionTemplate: `Предлагается обустроить контейнерную площадку для сбора ТКО по адресу: {address}.

**Тип контейнеров:** {container_type}
**Количество контейнеров:** {count}
**Дополнительно:** {extras}

Контейнерная площадка необходима для цивилизованного сбора и вывоза твёрдых коммунальных отходов.`,
    tags: ["мусор", "тко", "контейнеры", "экология"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "container_type",
        label: "Тип контейнеров",
        type: "select",
        required: true,
        options: [
          "Обычные (0.75 м³)",
          "Евроконтейнеры",
          "Подземные",
          "Бункеры",
          "Сортировочные (раздельный сбор)",
        ],
      },
      {
        name: "count",
        label: "Количество контейнеров",
        type: "text",
        required: true,
        placeholder: "Штук",
      },
      {
        name: "extras",
        label: "Дополнительно",
        type: "textarea",
        required: false,
        placeholder: "Ограждение, навес, освещение, отмостка, видеонаблюдение",
      },
    ],
  },
  {
    id: "cleanup",
    category: "Экология и чистота",
    type: "Проведение субботника",
    titleTemplate: "Проведение субботника по адресу {address}",
    descriptionTemplate: `Предлагается провести субботник по адресу: {address}.

**Дата проведения:** {date}
**Планируемое количество участников:** {participants}
**Объём работ:** {scope}

Субботник направлен на очистку территории, улучшение санитарного состояния и воспитание бережного отношения к окружающей среде.`,
    tags: ["субботник", "уборка", "экология", "чистота"],
    parameters: [
      {
        name: "address",
        label: "Адрес территории",
        type: "text",
        required: true,
        placeholder: "Улица, двор, парк",
      },
      {
        name: "date",
        label: "Дата проведения",
        type: "text",
        required: true,
        placeholder: "Например: 15 мая 2025",
      },
      {
        name: "participants",
        label: "Планируемое количество участников",
        type: "text",
        required: true,
        placeholder: "человек",
      },
      {
        name: "scope",
        label: "Объём работ",
        type: "textarea",
        required: false,
        placeholder: "Уборка мусора, покраска, посадка цветов и т.д.",
      },
    ],
  },
  {
    id: "holiday",
    category: "Культура и досуг",
    type: "Проведение праздника",
    titleTemplate: "Проведение праздника «{holiday_name}» по адресу {address}",
    descriptionTemplate: `Предлагается провести праздничное мероприятие «{holiday_name}» по адресу: {address}.

**Дата и время:** {date}
**Программа:** {program}
**Ожидаемое количество жителей:** {residents_count}

Мероприятие направлено на укрепление соседских связей и создание благоприятной социальной атмосферы.`,
    tags: ["праздник", "досуг", "культура", "мероприятие"],
    parameters: [
      {
        name: "holiday_name",
        label: "Название праздника",
        type: "text",
        required: true,
        placeholder: "День соседей, Масленица, Новый год...",
      },
      {
        name: "address",
        label: "Место проведения",
        type: "text",
        required: true,
        placeholder: "Адрес или площадка",
      },
      {
        name: "date",
        label: "Дата и время",
        type: "text",
        required: true,
        placeholder: "Например: 12 июня, 15:00",
      },
      {
        name: "program",
        label: "Программа",
        type: "textarea",
        required: false,
        placeholder: "Конкурсы, концерт, чаепитие, игры",
      },
      {
        name: "residents_count",
        label: "Ожидаемое количество жителей",
        type: "text",
        required: false,
        placeholder: "человек",
      },
    ],
  },
  {
    id: "lecture",
    category: "Культура и досуг",
    type: "Лекция или мастер-класс",
    titleTemplate: "Проведение лекции/мастер-класса на тему «{topic}»",
    descriptionTemplate: `Предлагается провести обучающее мероприятие на тему: «{topic}».

**Место проведения:** {place}
**Дата и время:** {date}
**Ведущий/лектор:** {speaker}
**Целевая аудитория:** {audience}

Мероприятие направлено на повышение образовательного и культурного уровня жителей.`,
    tags: ["образование", "лекция", "мастер-класс", "обучение"],
    parameters: [
      {
        name: "topic",
        label: "Тема",
        type: "text",
        required: true,
        placeholder: "Название лекции или мастер-класса",
      },
      {
        name: "place",
        label: "Место проведения",
        type: "text",
        required: true,
        placeholder: "Адрес или название учреждения",
      },
      {
        name: "date",
        label: "Дата и время",
        type: "text",
        required: true,
        placeholder: "Например: 20 мая, 18:00",
      },
      {
        name: "speaker",
        label: "Ведущий/лектор",
        type: "text",
        required: true,
        placeholder: "Адрес кошелкьа",
      },
      {
        name: "audience",
        label: "Целевая аудитория",
        type: "text",
        required: false,
        placeholder: "Взрослые, дети, подростки, все желающие",
      },
    ],
  },
  {
    id: "bench",
    category: "Инфраструктура",
    type: "Установка скамейки",
    titleTemplate: "Установка скамейки по адресу {address}",
    descriptionTemplate: `Предлагается установить скамейку по адресу: {address}.

**Тип скамейки:** {bench_type}
**Количество:** {count}
**Место размещения:** {placement}

Установка скамейки обеспечит комфортное пребывание жителей на дворовой территории.`,
    tags: ["скамейка", "инфраструктура", "двор", "отдых"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "bench_type",
        label: "Тип скамейки",
        type: "select",
        required: true,
        options: [
          "Деревянная",
          "Металлическая",
          "Со спинкой",
          "Без спинки",
          "Парковая",
          "Антивандальная",
        ],
      },
      {
        name: "count",
        label: "Количество",
        type: "text",
        required: true,
        placeholder: "Штук",
      },
      {
        name: "placement",
        label: "Место размещения",
        type: "textarea",
        required: false,
        placeholder: "Конкретное место во дворе, у подъезда, в парке",
      },
    ],
  },
  {
    id: "trash-bin",
    category: "Инфраструктура",
    type: "Установка урны",
    titleTemplate: "Установка урны по адресу {address}",
    descriptionTemplate: `Предлагается установить урну для мусора по адресу: {address}.

**Тип урны:** {bin_type}
**Количество:** {count}

Установка дополнительных урн будет способствовать поддержанию чистоты на территории.`,
    tags: ["урна", "чистота", "мусор", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
      },
      {
        name: "bin_type",
        label: "Тип урны",
        type: "select",
        required: true,
        options: [
          "Уличная металлическая",
          "Пластиковая",
          "Бетонная",
          "С пепельницей",
          "Декоративная",
        ],
      },
      {
        name: "count",
        label: "Количество",
        type: "text",
        required: true,
        placeholder: "Штук",
      },
    ],
  },
  {
    id: "video-surveillance",
    category: "Инфраструктура",
    type: "Установка видеонаблюдения",
    titleTemplate: "Установка системы видеонаблюдения по адресу {address}",
    descriptionTemplate: `Предлагается установить систему видеонаблюдения по адресу: {address}.

**Количество камер:** {cameras}
**Зоны покрытия:** {zones}
**Тип системы:** {system_type}

Установка видеонаблюдения позволит повысить уровень безопасности на территории, предотвратить акты вандализма и противоправные действия.`,
    tags: ["видеонаблюдение", "безопасность", "камеры", "двор"],
    parameters: [
      {
        name: "address",
        label: "Адрес",
        type: "text",
        required: true,
        placeholder: "Улица, номера домов",
      },
      {
        name: "cameras",
        label: "Количество камер",
        type: "text",
        required: true,
        placeholder: "Штук",
      },
      {
        name: "zones",
        label: "Зоны покрытия",
        type: "textarea",
        required: false,
        placeholder: "Входные группы, парковка, детская площадка",
      },
      {
        name: "system_type",
        label: "Тип системы",
        type: "select",
        required: true,
        options: ["Аналоговая", "IP-камеры", "Беспроводная", "Облачная"],
      },
    ],
  },
  {
    id: "help-elderly",
    category: "Социальные инициативы",
    type: "Помощь пожилым и маломобильным",
    titleTemplate:
      "Организация помощи пожилым и маломобильным жителям района {district}",
    descriptionTemplate: `Предлагается организовать систему взаимопомощи для пожилых и маломобильных жителей района: {district}.

**Виды помощи:** {help_types}
**Периодичность:** {frequency}
**Координатор:** {coordinator}
**Количество волонтёров:** {volunteers}

Инициатива направлена на поддержку наиболее уязвимых категорий жителей и развитие соседской взаимопомощи.`,
    tags: ["помощь", "пожилые", "социальное", "волонтёры"],
    parameters: [
      {
        name: "district",
        label: "Район",
        type: "text",
        required: true,
        placeholder: "Название района или улицы",
      },
      {
        name: "help_types",
        label: "Виды помощи",
        type: "select",
        required: true,
        options: [
          "Продуктовая помощь",
          "Доставка лекарств",
          "Уборка квартир",
          "Сопровождение к врачу",
          "Юридическая помощь",
          "Комплексная",
        ],
      },
      {
        name: "frequency",
        label: "Периодичность",
        type: "select",
        required: true,
        options: [
          "Одноразовая акция",
          "Еженедельно",
          "Ежемесячно",
          "По запросу",
          "Постоянно",
        ],
      },
      {
        name: "coordinator",
        label: "Координатор",
        type: "text",
        required: true,
        placeholder: "Адрес кошелька координатора",
      },
      {
        name: "volunteers",
        label: "Количество волонтёров",
        type: "text",
        required: false,
        placeholder: "человек",
      },
    ],
  },
  {
    id: "hobby-group",
    category: "Социальные инициативы",
    type: "Создание кружка или секции",
    titleTemplate: "Создание кружка/секции «{group_name}»",
    descriptionTemplate: `Предлагается создать кружок или секцию «{group_name}».

**Направление:** {direction}
**Возрастная группа:** {age_group}
**Место проведения:** {place}
**Расписание:** {schedule}
**Ведущий/руководитель:** {leader}

Кружок будет способствовать развитию творческих, спортивных или интеллектуальных способностей участников.`,
    tags: ["кружок", "секция", "досуг", "дети"],
    parameters: [
      {
        name: "group_name",
        label: "Название кружка/секции",
        type: "text",
        required: true,
        placeholder: "Например: «Умелые ручки», «Шахматный клуб»",
      },
      {
        name: "direction",
        label: "Направление",
        type: "select",
        required: true,
        options: [
          "Спортивное",
          "Творческое",
          "Интеллектуальное",
          "Музыкальное",
          "Художественное",
          "Техническое",
          "Танцевальное",
        ],
      },
      {
        name: "age_group",
        label: "Возрастная группа",
        type: "select",
        required: true,
        options: [
          "Дети 3–6 лет",
          "Дети 7–12 лет",
          "Подростки 13–17 лет",
          "Взрослые",
          "Смешанная",
        ],
      },
      {
        name: "place",
        label: "Место проведения",
        type: "text",
        required: true,
        placeholder: "Адрес или учреждение",
      },
      {
        name: "schedule",
        label: "Расписание",
        type: "text",
        required: true,
        placeholder: "Дни недели и время",
      },
      {
        name: "leader",
        label: "Ведущий/руководитель",
        type: "text",
        required: true,
        placeholder: "Адрес кошелька",
      },
    ],
  },
  {
    id: "multisig-mint",
    category: "Мультикошелек",
    type: "Выпуск токенов",
    titleTemplate:
      "Выпуск {amount} жетонов контракта {jettonMinterAddress} на адрес {toAddress}",
    descriptionTemplate: `Предлагается выпустить (сминтить) {amount} жетонов контракта {jettonMinterAddress} на адрес {toAddress} через мультикошелек {multisigAddress}.

После завершения голосования с положительным результатом решение можно применить в мультикошельке одной транзакцией.`,
    tags: ["мультикошелек", "минт", "жетоны", "выпуск"],
    parameters: [
      {
        name: "jettonMinterAddress",
        label: "Адрес жетона (minter)",
        type: "text",
        required: true,
        placeholder: "EQ...",
      },
      {
        name: "amount",
        label: "Количество жетонов (в единицах)",
        type: "text",
        required: true,
        placeholder: "1000",
      },
      {
        name: "toAddress",
        label: "Адрес получателя",
        type: "text",
        required: true,
        placeholder: "EQ...",
      },
      {
        name: "multisigAddress",
        label: "Адрес мультикошелька (администратор жетона)",
        type: "text",
        required: true,
        placeholder: "EQ...",
      },
    ],
  },
];

export const CATEGORIES = Array.from(
  new Set(TEMPLATES.map((t) => t.category)),
).sort();

export const MANUAL_TEMPLATE: ProposalTemplate = {
  id: "manual",
  category: "Другое",
  type: "Свободный ввод",
  titleTemplate: "",
  descriptionTemplate: "",
  tags: ["manual"],
  parameters: [],
};

export const getTemplatesByCategory = (category: string) =>
  TEMPLATES.filter((t) => t.category === category);

export const getTemplateById = (id: string) =>
  TEMPLATES.find((t) => t.id === id) || null;

export const generateFromTemplate = (
  template: ProposalTemplate,
  params: Record<string, string>,
): { title: string; description: string } => {
  let title = template.titleTemplate;
  let description = template.descriptionTemplate;

  for (const [key, value] of Object.entries(params)) {
    title = title.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
    description = description.replace(
      new RegExp(`\\{${key}\\}`, "g"),
      value || "",
    );
  }

  return { title, description };
};
