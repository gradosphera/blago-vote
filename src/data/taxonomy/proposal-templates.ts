export interface TemplateParameter {
  name: string;
  label: string;
  labelEn?: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  optionsEn?: string[];
  required: boolean;
  placeholder?: string;
  placeholderEn?: string;
}

export interface ProposalTemplate {
  id: string;
  category: string;
  categoryEn?: string;
  type: string;
  typeEn?: string;
  titleTemplate: string;
  titleTemplateEn?: string;
  descriptionTemplate: string;
  descriptionTemplateEn?: string;
  tags: string[];
  parameters: TemplateParameter[];
}

export const TEMPLATES: ProposalTemplate[] = [
  {
    id: "tos-create",
    category: "Территориальное самоуправление",
    categoryEn: "Territorial Self-Government",
    type: "Создание ТОС",
    typeEn: "Create TSG",
    titleTemplate: "Создание ТОС «{name}» на территории {address}",
    titleTemplateEn: "Create Territorial Self-Government (TSG) «{name}» at {address}",
    descriptionTemplate: `Предлагается создать Территориальное общественное самоуправление (ТОС) «{name}» на территории по адресу: {address}.

**Инициативная группа:** {initiative_group}
**Цель создания:** {goal}

**Основные направления деятельности:**
{activities}

Приглашаем всех жителей данной территории принять участие в собрании и поддержать создание ТОС.`,
    descriptionTemplateEn: `It is proposed to create a Territorial Self-Government (TSG) «{name}» at the following address: {address}.

**Initiative group:** {initiative_group}
**Purpose:** {goal}

**Main areas of activity:**
{activities}

We invite all residents of this territory to participate in the meeting and support the creation of the TSG.`,
    tags: ["тос", "самоуправление", "территория", "инициатива"],
    parameters: [
      {
        name: "name",
        label: "Название ТОС",
        labelEn: "TSG Name",
        type: "text",
        required: true,
        placeholder: "Например: «Наш двор»",
        placeholderEn: "E.g.: \"Our Yard\"",
      },
      {
        name: "address",
        label: "Адрес территории",
        labelEn: "Territory Address",
        type: "text",
        required: true,
        placeholder: "Улица, дом, район",
        placeholderEn: "Street, building, district",
      },
      {
        name: "initiative_group",
        label: "Инициативная группа",
        labelEn: "Initiative Group",
        type: "text",
        required: true,
        placeholder: "Адрес мультикошелька или список адресов кошельков",
        placeholderEn: "Multisig address or list of wallet addresses",
      },
      {
        name: "goal",
        label: "Цель создания",
        labelEn: "Purpose",
        type: "select",
        required: true,
        options: [
          "Благоустройство территории",
          "Организация досуга",
          "Решение коммунальных вопросов",
          "Повышение безопасности",
          "Комплексное развитие",
        ],
        optionsEn: [
          "Territory improvement",
          "Recreation organization",
          "Utility issues resolution",
          "Safety improvement",
          "Comprehensive development",
        ],
        placeholder: "Основная цель",
        placeholderEn: "Main purpose",
      },
      {
        name: "activities",
        label: "Основные направления деятельности",
        labelEn: "Main Areas of Activity",
        type: "textarea",
        required: false,
        placeholder: "Краткое описание планируемых мероприятий",
        placeholderEn: "Brief description of planned activities",
      },
    ],
  },
  {
    id: "tos-council",
    category: "Территориальное самоуправление",
    categoryEn: "Territorial Self-Government",
    type: "Создание Совета дома",
    typeEn: "Create Building Council",
    titleTemplate: "Создание Совета многоквартирного дома по адресу {address}",
    titleTemplateEn: "Create Building Council at {address}",
    descriptionTemplate: `Предлагается создать Совет многоквартирного дома по адресу: {address}.

**Председатель:** {chairman}
**Состав совета:** {members}
**Срок полномочий:** {term}

**Основные задачи:**
{tasks}

Совет дома будет представлять интересы жильцов во взаимодействии с управляющей компанией и органами власти.`,
    descriptionTemplateEn: `It is proposed to create a Building Council at the following address: {address}.

**Chairman:** {chairman}
**Council members:** {members}
**Term of office:** {term}

**Main tasks:**
{tasks}

The building council will represent the interests of residents in interaction with the management company and government authorities.`,
    tags: ["совет_дома", "мкд", "жкх", "управление"],
    parameters: [
      {
        name: "address",
        label: "Адрес дома",
        labelEn: "Building Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "chairman",
        label: "Председатель",
        labelEn: "Chairman",
        type: "text",
        required: true,
        placeholder: "Адрес кошелька председателя",
        placeholderEn: "Chairman's wallet address",
      },
      {
        name: "members",
        label: "Состав совета",
        labelEn: "Council Members",
        type: "textarea",
        required: true,
        placeholder: "Адрес мультикошелька членов совета",
        placeholderEn: "Multisig address of council members",
      },
      {
        name: "term",
        label: "Срок полномочий",
        labelEn: "Term of Office",
        type: "select",
        required: true,
        options: ["1 год", "2 года", "3 года", "5 лет"],
        optionsEn: ["1 year", "2 years", "3 years", "5 years"],
      },
      {
        name: "tasks",
        label: "Основные задачи",
        labelEn: "Main Tasks",
        type: "textarea",
        required: false,
        placeholder: "Перечень основных задач",
        placeholderEn: "List of main tasks",
      },
    ],
  },
  {
    id: "greening-yard",
    category: "Благоустройство двора",
    categoryEn: "Yard Improvement",
    type: "Озеленение двора",
    typeEn: "Yard Greening",
    titleTemplate: "Озеленение двора по адресу {address}",
    titleTemplateEn: "Yard greening at {address}",
    descriptionTemplate: `Предлагается провести озеленение дворовой территории по адресу: {address}.

**Тип озеленения:** {greening_type}
**Площадь:** {area}
**Предполагаемые растения/элементы:** {plants}

Данная инициатива направлена на улучшение экологической обстановки и повышение комфорта проживания жителей.`,
    descriptionTemplateEn: `It is proposed to green the courtyard area at the following address: {address}.

**Greening type:** {greening_type}
**Area:** {area}
**Planned plants/elements:** {plants}

This initiative aims to improve the ecological situation and increase the comfort of residents.`,
    tags: ["озеленение", "двор", "растения", "экология"],
    parameters: [
      {
        name: "address",
        label: "Адрес двора",
        labelEn: "Yard Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "greening_type",
        label: "Тип озеленения",
        labelEn: "Greening Type",
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
        optionsEn: [
          "Flower beds and borders",
          "Tree planting",
          "Lawn",
          "Hedge",
          "Mixed",
          "Vertical greening",
        ],
      },
      {
        name: "area",
        label: "Площадь (м²)",
        labelEn: "Area (m²)",
        type: "text",
        required: true,
        placeholder: "Ориентировочная площадь",
        placeholderEn: "Approximate area",
      },
      {
        name: "plants",
        label: "Предполагаемые растения/элементы",
        labelEn: "Planned Plants/Elements",
        type: "textarea",
        required: false,
        placeholder: "Какие растения, кустарники, деревья планируется высадить",
        placeholderEn: "Which plants, shrubs, trees are planned to be planted",
      },
    ],
  },
  {
    id: "playground",
    category: "Благоустройство двора",
    categoryEn: "Yard Improvement",
    type: "Установка детской площадки",
    typeEn: "Playground Installation",
    titleTemplate: "Установка детской игровой площадки по адресу {address}",
    titleTemplateEn: "Install children's playground at {address}",
    descriptionTemplate: `Предлагается установить детскую игровую площадку по адресу: {address}.

**Возрастная группа:** {age_group}
**Тип покрытия:** {covering}
**Перечень оборудования:** {equipment}

Площадка предназначена для детей возрастом {age_group}. Установка площадки позволит создать безопасное и развивающее пространство для детей.`,
    descriptionTemplateEn: `It is proposed to install a children's playground at the following address: {address}.

**Age group:** {age_group}
**Surface type:** {covering}
**Equipment list:** {equipment}

The playground is designed for children aged {age_group}. Installation will create a safe and developmental space for children.`,
    tags: ["детская_площадка", "двор", "дети", "благоустройство"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        labelEn: "Installation Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "age_group",
        label: "Возрастная группа",
        labelEn: "Age Group",
        type: "select",
        required: true,
        options: [
          "1–3 года",
          "3–7 лет",
          "7–12 лет",
          "3–12 лет",
          "0+ (все возраста)",
        ],
        optionsEn: [
          "1–3 years",
          "3–7 years",
          "7–12 years",
          "3–12 years",
          "0+ (all ages)",
        ],
      },
      {
        name: "covering",
        label: "Тип покрытия",
        labelEn: "Surface Type",
        type: "select",
        required: true,
        options: [
          "Резиновое (резиновая крошка)",
          "Песок",
          "Искусственный газон",
          "Деревянный настил",
          "Комбинированное",
        ],
        optionsEn: [
          "Rubber (rubber crumb)",
          "Sand",
          "Artificial turf",
          "Wooden deck",
          "Combined",
        ],
      },
      {
        name: "equipment",
        label: "Перечень оборудования",
        labelEn: "Equipment List",
        type: "textarea",
        required: true,
        placeholder:
          "Горка, качели, карусель, песочница, спортивный комплекс и т.д.",
        placeholderEn: "Slide, swings, carousel, sandbox, sports complex, etc.",
      },
    ],
  },
  {
    id: "sports-ground",
    category: "Благоустройство двора",
    categoryEn: "Yard Improvement",
    type: "Создание спортивной площадки",
    typeEn: "Sports Court Creation",
    titleTemplate: "Создание спортивной площадки по адресу {address}",
    titleTemplateEn: "Create sports court at {address}",
    descriptionTemplate: `Предлагается создать спортивную площадку по адресу: {address}.

**Вид спорта:** {sport_type}
**Тип покрытия:** {covering}
**Размер площадки:** {size}
**Оборудование:** {equipment}

Создание спортивной площадки будет способствовать популяризации здорового образа жизни и организации досуга жителей.`,
    descriptionTemplateEn: `It is proposed to create a sports court at the following address: {address}.

**Sport type:** {sport_type}
**Surface type:** {covering}
**Court size:** {size}
**Equipment:** {equipment}

Creating a sports court will promote a healthy lifestyle and organize residents' recreation.`,
    tags: ["спорт", "площадка", "зож", "двор"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        labelEn: "Installation Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "sport_type",
        label: "Вид спорта",
        labelEn: "Sport Type",
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
        optionsEn: [
          "Workout",
          "Football",
          "Basketball",
          "Volleyball",
          "Tennis",
          "Universal",
          "Streetball",
        ],
      },
      {
        name: "covering",
        label: "Тип покрытия",
        labelEn: "Surface Type",
        type: "select",
        required: true,
        options: [
          "Резиновое",
          "Газон",
          "Асфальт",
          "Плитка",
          "Специальное спортивное",
        ],
        optionsEn: [
          "Rubber",
          "Lawn",
          "Asphalt",
          "Tiles",
          "Special sports surface",
        ],
      },
      {
        name: "size",
        label: "Размер площадки",
        labelEn: "Court Size",
        type: "text",
        required: false,
        placeholder: "Например: 15×30 м",
        placeholderEn: "E.g.: 15×30 m",
      },
      {
        name: "equipment",
        label: "Оборудование",
        labelEn: "Equipment",
        type: "textarea",
        required: false,
        placeholder: "Ворота, кольца, турники, скамейки и т.д.",
        placeholderEn: "Goals, rings, bars, benches, etc.",
      },
    ],
  },
  {
    id: "rest-area",
    category: "Благоустройство двора",
    categoryEn: "Yard Improvement",
    type: "Обустройство зоны отдыха",
    typeEn: "Rest Area Development",
    titleTemplate: "Обустройство зоны отдыха по адресу {address}",
    titleTemplateEn: "Develop rest area at {address}",
    descriptionTemplate: `Предлагается обустроить зону отдыха по адресу: {address}.

**Тип зоны отдыха:** {rest_type}
**Количество мест:** {seats}
**Дополнительное оснащение:** {extras}

Зона отдыха станет местом притяжения жителей для общения и проведения досуга на свежем воздухе.`,
    descriptionTemplateEn: `It is proposed to develop a rest area at the following address: {address}.

**Rest area type:** {rest_type}
**Number of seats:** {seats}
**Additional equipment:** {extras}

The rest area will become a gathering place for residents to communicate and spend leisure time outdoors.`,
    tags: ["отдых", "двор", "скамейки", "благоустройство"],
    parameters: [
      {
        name: "address",
        label: "Адрес",
        labelEn: "Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "rest_type",
        label: "Тип зоны отдыха",
        labelEn: "Rest Area Type",
        type: "select",
        required: true,
        options: [
          "Скамейки и столы",
          "Беседка",
          "Мангальная зона",
          "Танцевальная площадка",
          "Летняя веранда",
        ],
        optionsEn: [
          "Benches and tables",
          "Gazebo",
          "BBQ area",
          "Dance floor",
          "Summer veranda",
        ],
      },
      {
        name: "seats",
        label: "Количество мест",
        labelEn: "Number of Seats",
        type: "text",
        required: true,
        placeholder: "Ориентировочное количество",
        placeholderEn: "Approximate number",
      },
      {
        name: "extras",
        label: "Дополнительное оснащение",
        labelEn: "Additional Equipment",
        type: "textarea",
        required: false,
        placeholder: "Освещение, урны, клумбы, навес и т.д.",
        placeholderEn: "Lighting, trash cans, flower beds, canopy, etc.",
      },
    ],
  },
  {
    id: "parking",
    category: "Благоустройство двора",
    categoryEn: "Yard Improvement",
    type: "Организация парковки",
    typeEn: "Parking Organization",
    titleTemplate: "Организация парковки по адресу {address}",
    titleTemplateEn: "Organize parking at {address}",
    descriptionTemplate: `Предлагается организовать парковку по адресу: {address}.

**Тип парковки:** {parking_type}
**Количество мест:** {spots}
**Тип покрытия:** {covering}
**Дополнительно:** {extras}

Организация парковки позволит упорядочить стоянку транспортных средств и разгрузить внутридворовые проезды.`,
    descriptionTemplateEn: `It is proposed to organize parking at the following address: {address}.

**Parking type:** {parking_type}
**Number of spots:** {spots}
**Surface type:** {covering}
**Additional:** {extras}

Organizing parking will help arrange vehicle parking and relieve courtyard driveways.`,
    tags: ["парковка", "машина", "двор", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес",
        labelEn: "Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "parking_type",
        label: "Тип парковки",
        labelEn: "Parking Type",
        type: "select",
        required: true,
        options: [
          "Гостевая",
          "Постоянная",
          "Велосипедная",
          "Для инвалидов",
          "Электрозарядная",
        ],
        optionsEn: [
          "Visitor",
          "Permanent",
          "Bicycle",
          "Disabled",
          "EV charging",
        ],
      },
      {
        name: "spots",
        label: "Количество мест",
        labelEn: "Number of Spots",
        type: "text",
        required: true,
        placeholder: "Количество машино-мест",
        placeholderEn: "Number of parking spaces",
      },
      {
        name: "covering",
        label: "Тип покрытия",
        labelEn: "Surface Type",
        type: "select",
        required: true,
        options: ["Асфальт", "Плитка", "Газонная решётка", "Щебень", "Бетон"],
        optionsEn: ["Asphalt", "Tiles", "Grass pavers", "Gravel", "Concrete"],
      },
      {
        name: "extras",
        label: "Дополнительно",
        labelEn: "Additional",
        type: "textarea",
        required: false,
        placeholder: "Шлагбаум, освещение, разметка, знаки",
        placeholderEn: "Barrier, lighting, markings, signs",
      },
    ],
  },
  {
    id: "lighting-install",
    category: "Освещение",
    categoryEn: "Lighting",
    type: "Установка освещения",
    typeEn: "Lighting Installation",
    titleTemplate: "Установка освещения по адресу {address}",
    titleTemplateEn: "Install lighting at {address}",
    descriptionTemplate: `Предлагается установить освещение по адресу: {address}.

**Тип освещения:** {lighting_type}
**Количество опор:** {poles}
**Зона освещения:** {zone}

Установка освещения повысит безопасность и комфорт передвижения в тёмное время суток.`,
    descriptionTemplateEn: `It is proposed to install lighting at the following address: {address}.

**Lighting type:** {lighting_type}
**Number of poles:** {poles}
**Lighting zone:** {zone}

Installing lighting will improve safety and comfort of movement in the dark.`,
    tags: ["освещение", "свет", "безопасность", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес территории",
        labelEn: "Territory Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома, участок",
        placeholderEn: "Street, building number, area",
      },
      {
        name: "lighting_type",
        label: "Тип освещения",
        labelEn: "Lighting Type",
        type: "select",
        required: true,
        options: [
          "Светодиодное",
          "На солнечных батареях",
          "Обычное",
          "Декоративное",
          "Прожекторное",
        ],
        optionsEn: [
          "LED",
          "Solar-powered",
          "Standard",
          "Decorative",
          "Floodlight",
        ],
      },
      {
        name: "poles",
        label: "Количество опор",
        labelEn: "Number of Poles",
        type: "text",
        required: true,
        placeholder: "Количество столбов освещения",
        placeholderEn: "Number of light poles",
      },
      {
        name: "zone",
        label: "Зона освещения",
        labelEn: "Lighting Zone",
        type: "text",
        required: false,
        placeholder: "Двор, улица, парк, подъезд и т.д.",
        placeholderEn: "Courtyard, street, park, entrance, etc.",
      },
    ],
  },
  {
    id: "road-repair",
    category: "Дорожное хозяйство",
    categoryEn: "Road Infrastructure",
    type: "Ремонт дороги",
    typeEn: "Road Repair",
    titleTemplate: "Ремонт дорожного покрытия на участке {address}",
    titleTemplateEn: "Repair road surface at {address}",
    descriptionTemplate: `Предлагается провести ремонт дорожного покрытия на участке: {address}.

**Тип покрытия:** {covering}
**Протяжённость:** {length}
**Ширина:** {width}
**Характер работ:** {work_type}

Ремонт необходим для обеспечения безопасного и комфортного передвижения транспорта и пешеходов.`,
    descriptionTemplateEn: `It is proposed to repair the road surface at the following section: {address}.

**Surface type:** {covering}
**Length:** {length}
**Width:** {width}
**Scope of work:** {work_type}

Repair is necessary to ensure safe and comfortable movement of vehicles and pedestrians.`,
    tags: ["дорога", "ремонт", "покрытие", "транспорт"],
    parameters: [
      {
        name: "address",
        label: "Адрес участка",
        labelEn: "Section Address",
        type: "text",
        required: true,
        placeholder: "От дома № до дома № или ориентир",
        placeholderEn: "From building No. to building No. or landmark",
      },
      {
        name: "covering",
        label: "Тип покрытия",
        labelEn: "Surface Type",
        type: "select",
        required: true,
        options: ["Асфальт", "Плитка", "Щебень", "Бетон", "Грунт"],
        optionsEn: ["Asphalt", "Tiles", "Gravel", "Concrete", "Soil"],
      },
      {
        name: "length",
        label: "Протяжённость",
        labelEn: "Length",
        type: "text",
        required: true,
        placeholder: "метров",
        placeholderEn: "meters",
      },
      {
        name: "width",
        label: "Ширина",
        labelEn: "Width",
        type: "text",
        required: false,
        placeholder: "метров",
        placeholderEn: "meters",
      },
      {
        name: "work_type",
        label: "Характер работ",
        labelEn: "Scope of Work",
        type: "select",
        required: true,
        options: [
          "Ямочный ремонт",
          "Капитальный ремонт",
          "Замена покрытия",
          "Расширение проезжей части",
        ],
        optionsEn: [
          "Pothole repair",
          "Major repair",
          "Surface replacement",
          "Roadway expansion",
        ],
      },
    ],
  },
  {
    id: "sidewalk",
    category: "Дорожное хозяйство",
    categoryEn: "Road Infrastructure",
    type: "Обустройство тротуара",
    typeEn: "Sidewalk Development",
    titleTemplate: "Обустройство тротуара по адресу {address}",
    titleTemplateEn: "Develop sidewalk at {address}",
    descriptionTemplate: `Предлагается обустроить тротуар по адресу: {address}.

**Длина тротуара:** {length}
**Ширина тротуара:** {width}
**Тип покрытия:** {covering}

Обустройство тротуара обеспечит безопасное и комфортное передвижение пешеходов, в том числе маломобильных групп населения.`,
    descriptionTemplateEn: `It is proposed to develop a sidewalk at the following address: {address}.

**Sidewalk length:** {length}
**Sidewalk width:** {width}
**Surface type:** {covering}

Developing the sidewalk will ensure safe and comfortable movement for pedestrians, including people with limited mobility.`,
    tags: ["тротуар", "пешеход", "безопасность", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес участка",
        labelEn: "Section Address",
        type: "text",
        required: true,
        placeholder: "Улица, участок",
        placeholderEn: "Street, section",
      },
      {
        name: "length",
        label: "Длина",
        labelEn: "Length",
        type: "text",
        required: true,
        placeholder: "метров",
        placeholderEn: "meters",
      },
      {
        name: "width",
        label: "Ширина",
        labelEn: "Width",
        type: "text",
        required: true,
        placeholder: "метров",
        placeholderEn: "meters",
      },
      {
        name: "covering",
        label: "Тип покрытия",
        labelEn: "Surface Type",
        type: "select",
        required: true,
        options: ["Асфальт", "Плитка", "Бетон", "Резиновая плитка"],
        optionsEn: ["Asphalt", "Tiles", "Concrete", "Rubber tiles"],
      },
    ],
  },
  {
    id: "speed-bump",
    category: "Дорожное хозяйство",
    categoryEn: "Road Infrastructure",
    type: "Установка «лежачего полицейского»",
    typeEn: "Speed Bump Installation",
    titleTemplate: "Установка искусственной неровности по адресу {address}",
    titleTemplateEn: "Install speed bump at {address}",
    descriptionTemplate: `Предлагается установить искусственную дорожную неровность по адресу: {address}.

**Тип неровности:** {type}
**Количество:** {count}

Установка необходима для принудительного ограничения скорости движения транспортных средств и повышения безопасности пешеходов.`,
    descriptionTemplateEn: `It is proposed to install a speed bump at the following address: {address}.

**Bump type:** {type}
**Quantity:** {count}

Installation is necessary to forcibly limit vehicle speed and improve pedestrian safety.`,
    tags: ["безопасность", "дорога", "лп", "пешеход"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        labelEn: "Installation Address",
        type: "text",
        required: true,
        placeholder: "Улица, участок",
        placeholderEn: "Street, section",
      },
      {
        name: "type",
        label: "Тип неровности",
        labelEn: "Bump Type",
        type: "select",
        required: true,
        options: ["Резиновая", "Пластиковая", "Асфальтовая", "Сборная"],
        optionsEn: ["Rubber", "Plastic", "Asphalt", "Modular"],
      },
      {
        name: "count",
        label: "Количество",
        labelEn: "Quantity",
        type: "text",
        required: true,
        placeholder: "1, 2, 3...",
        placeholderEn: "1, 2, 3...",
      },
    ],
  },
  {
    id: "trash-area",
    category: "Экология и чистота",
    categoryEn: "Ecology and Cleanliness",
    type: "Обустройство контейнерной площадки",
    typeEn: "Waste Container Area Development",
    titleTemplate: "Обустройство контейнерной площадки по адресу {address}",
    titleTemplateEn: "Develop waste container area at {address}",
    descriptionTemplate: `Предлагается обустроить контейнерную площадку для сбора ТКО по адресу: {address}.

**Тип контейнеров:** {container_type}
**Количество контейнеров:** {count}
**Дополнительно:** {extras}

Контейнерная площадка необходима для цивилизованного сбора и вывоза твёрдых коммунальных отходов.`,
    descriptionTemplateEn: `It is proposed to develop a waste container area for solid municipal waste at the following address: {address}.

**Container type:** {container_type}
**Number of containers:** {count}
**Additional:** {extras}

A container area is necessary for the civilized collection and removal of solid municipal waste.`,
    tags: ["мусор", "тко", "контейнеры", "экология"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        labelEn: "Installation Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "container_type",
        label: "Тип контейнеров",
        labelEn: "Container Type",
        type: "select",
        required: true,
        options: [
          "Обычные (0.75 м³)",
          "Евроконтейнеры",
          "Подземные",
          "Бункеры",
          "Сортировочные (раздельный сбор)",
        ],
        optionsEn: [
          "Standard (0.75 m³)",
          "Eurocontainers",
          "Underground",
          "Dumpsters",
          "Sorting (recycling)",
        ],
      },
      {
        name: "count",
        label: "Количество контейнеров",
        labelEn: "Number of Containers",
        type: "text",
        required: true,
        placeholder: "Штук",
        placeholderEn: "Pieces",
      },
      {
        name: "extras",
        label: "Дополнительно",
        labelEn: "Additional",
        type: "textarea",
        required: false,
        placeholder: "Ограждение, навес, освещение, отмостка, видеонаблюдение",
        placeholderEn: "Fencing, canopy, lighting, paving, video surveillance",
      },
    ],
  },
  {
    id: "cleanup",
    category: "Экология и чистота",
    categoryEn: "Ecology and Cleanliness",
    type: "Проведение субботника",
    typeEn: "Clean-up Event",
    titleTemplate: "Проведение субботника по адресу {address}",
    titleTemplateEn: "Hold clean-up event at {address}",
    descriptionTemplate: `Предлагается провести субботник по адресу: {address}.

**Дата проведения:** {date}
**Планируемое количество участников:** {participants}
**Объём работ:** {scope}

Субботник направлен на очистку территории, улучшение санитарного состояния и воспитание бережного отношения к окружающей среде.`,
    descriptionTemplateEn: `It is proposed to hold a clean-up event at the following address: {address}.

**Date:** {date}
**Planned number of participants:** {participants}
**Scope of work:** {scope}

The clean-up aims to clean the territory, improve sanitary conditions and foster respect for the environment.`,
    tags: ["субботник", "уборка", "экология", "чистота"],
    parameters: [
      {
        name: "address",
        label: "Адрес территории",
        labelEn: "Territory Address",
        type: "text",
        required: true,
        placeholder: "Улица, двор, парк",
        placeholderEn: "Street, yard, park",
      },
      {
        name: "date",
        label: "Дата проведения",
        labelEn: "Date",
        type: "text",
        required: true,
        placeholder: "Например: 15 мая 2025",
        placeholderEn: "E.g.: May 15, 2025",
      },
      {
        name: "participants",
        label: "Планируемое количество участников",
        labelEn: "Planned Number of Participants",
        type: "text",
        required: true,
        placeholder: "человек",
        placeholderEn: "people",
      },
      {
        name: "scope",
        label: "Объём работ",
        labelEn: "Scope of Work",
        type: "textarea",
        required: false,
        placeholder: "Уборка мусора, покраска, посадка цветов и т.д.",
        placeholderEn: "Trash collection, painting, flower planting, etc.",
      },
    ],
  },
  {
    id: "holiday",
    category: "Культура и досуг",
    categoryEn: "Culture and Recreation",
    type: "Проведение праздника",
    typeEn: "Holiday Event",
    titleTemplate: "Проведение праздника «{holiday_name}» по адресу {address}",
    titleTemplateEn: "Hold «{holiday_name}» holiday event at {address}",
    descriptionTemplate: `Предлагается провести праздничное мероприятие «{holiday_name}» по адресу: {address}.

**Дата и время:** {date}
**Программа:** {program}
**Ожидаемое количество жителей:** {residents_count}

Мероприятие направлено на укрепление соседских связей и создание благоприятной социальной атмосферы.`,
    descriptionTemplateEn: `It is proposed to hold a holiday event «{holiday_name}» at the following address: {address}.

**Date and time:** {date}
**Program:** {program}
**Expected number of residents:** {residents_count}

The event aims to strengthen neighborly ties and create a favorable social atmosphere.`,
    tags: ["праздник", "досуг", "культура", "мероприятие"],
    parameters: [
      {
        name: "holiday_name",
        label: "Название праздника",
        labelEn: "Holiday Name",
        type: "text",
        required: true,
        placeholder: "День соседей, Масленица, Новый год...",
        placeholderEn: "Neighbor's Day, Maslenitsa, New Year...",
      },
      {
        name: "address",
        label: "Место проведения",
        labelEn: "Venue",
        type: "text",
        required: true,
        placeholder: "Адрес или площадка",
        placeholderEn: "Address or venue",
      },
      {
        name: "date",
        label: "Дата и время",
        labelEn: "Date and Time",
        type: "text",
        required: true,
        placeholder: "Например: 12 июня, 15:00",
        placeholderEn: "E.g.: June 12, 15:00",
      },
      {
        name: "program",
        label: "Программа",
        labelEn: "Program",
        type: "textarea",
        required: false,
        placeholder: "Конкурсы, концерт, чаепитие, игры",
        placeholderEn: "Contests, concert, tea party, games",
      },
      {
        name: "residents_count",
        label: "Ожидаемое количество жителей",
        labelEn: "Expected Number of Residents",
        type: "text",
        required: false,
        placeholder: "человек",
        placeholderEn: "people",
      },
    ],
  },
  {
    id: "lecture",
    category: "Культура и досуг",
    categoryEn: "Culture and Recreation",
    type: "Лекция или мастер-класс",
    typeEn: "Lecture or Masterclass",
    titleTemplate: "Проведение лекции/мастер-класса на тему «{topic}»",
    titleTemplateEn: "Hold lecture/masterclass on «{topic}»",
    descriptionTemplate: `Предлагается провести обучающее мероприятие на тему: «{topic}».

**Место проведения:** {place}
**Дата и время:** {date}
**Ведущий/лектор:** {speaker}
**Целевая аудитория:** {audience}

Мероприятие направлено на повышение образовательного и культурного уровня жителей.`,
    descriptionTemplateEn: `It is proposed to hold an educational event on the topic: «{topic}».

**Venue:** {place}
**Date and time:** {date}
**Host/Speaker:** {speaker}
**Target audience:** {audience}

The event aims to improve the educational and cultural level of residents.`,
    tags: ["образование", "лекция", "мастер-класс", "обучение"],
    parameters: [
      {
        name: "topic",
        label: "Тема",
        labelEn: "Topic",
        type: "text",
        required: true,
        placeholder: "Название лекции или мастер-класса",
        placeholderEn: "Lecture or masterclass title",
      },
      {
        name: "place",
        label: "Место проведения",
        labelEn: "Venue",
        type: "text",
        required: true,
        placeholder: "Адрес или название учреждения",
        placeholderEn: "Address or institution name",
      },
      {
        name: "date",
        label: "Дата и время",
        labelEn: "Date and Time",
        type: "text",
        required: true,
        placeholder: "Например: 20 мая, 18:00",
        placeholderEn: "E.g.: May 20, 18:00",
      },
      {
        name: "speaker",
        label: "Ведущий/лектор",
        labelEn: "Host/Speaker",
        type: "text",
        required: true,
        placeholder: "Адрес кошелька",
        placeholderEn: "Wallet address",
      },
      {
        name: "audience",
        label: "Целевая аудитория",
        labelEn: "Target Audience",
        type: "text",
        required: false,
        placeholder: "Взрослые, дети, подростки, все желающие",
        placeholderEn: "Adults, children, teenagers, all welcome",
      },
    ],
  },
  {
    id: "bench",
    category: "Инфраструктура",
    categoryEn: "Infrastructure",
    type: "Установка скамейки",
    typeEn: "Bench Installation",
    titleTemplate: "Установка скамейки по адресу {address}",
    titleTemplateEn: "Install bench at {address}",
    descriptionTemplate: `Предлагается установить скамейку по адресу: {address}.

**Тип скамейки:** {bench_type}
**Количество:** {count}
**Место размещения:** {placement}

Установка скамейки обеспечит комфортное пребывание жителей на дворовой территории.`,
    descriptionTemplateEn: `It is proposed to install a bench at the following address: {address}.

**Bench type:** {bench_type}
**Quantity:** {count}
**Placement:** {placement}

Installing a bench will provide comfortable stay for residents in the courtyard area.`,
    tags: ["скамейка", "инфраструктура", "двор", "отдых"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        labelEn: "Installation Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "bench_type",
        label: "Тип скамейки",
        labelEn: "Bench Type",
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
        optionsEn: [
          "Wooden",
          "Metal",
          "With backrest",
          "Without backrest",
          "Park",
          "Anti-vandal",
        ],
      },
      {
        name: "count",
        label: "Количество",
        labelEn: "Quantity",
        type: "text",
        required: true,
        placeholder: "Штук",
        placeholderEn: "Pieces",
      },
      {
        name: "placement",
        label: "Место размещения",
        labelEn: "Placement",
        type: "textarea",
        required: false,
        placeholder: "Конкретное место во дворе, у подъезда, в парке",
        placeholderEn: "Specific place in yard, near entrance, in park",
      },
    ],
  },
  {
    id: "trash-bin",
    category: "Инфраструктура",
    categoryEn: "Infrastructure",
    type: "Установка урны",
    typeEn: "Trash Can Installation",
    titleTemplate: "Установка урны по адресу {address}",
    titleTemplateEn: "Install trash can at {address}",
    descriptionTemplate: `Предлагается установить урну для мусора по адресу: {address}.

**Тип урны:** {bin_type}
**Количество:** {count}

Установка дополнительных урн будет способствовать поддержанию чистоты на территории.`,
    descriptionTemplateEn: `It is proposed to install a trash can at the following address: {address}.

**Trash can type:** {bin_type}
**Quantity:** {count}

Installing additional trash cans will help maintain cleanliness in the area.`,
    tags: ["урна", "чистота", "мусор", "инфраструктура"],
    parameters: [
      {
        name: "address",
        label: "Адрес установки",
        labelEn: "Installation Address",
        type: "text",
        required: true,
        placeholder: "Улица, номер дома",
        placeholderEn: "Street, building number",
      },
      {
        name: "bin_type",
        label: "Тип урны",
        labelEn: "Trash Can Type",
        type: "select",
        required: true,
        options: [
          "Уличная металлическая",
          "Пластиковая",
          "Бетонная",
          "С пепельницей",
          "Декоративная",
        ],
        optionsEn: [
          "Outdoor metal",
          "Plastic",
          "Concrete",
          "With ashtray",
          "Decorative",
        ],
      },
      {
        name: "count",
        label: "Количество",
        labelEn: "Quantity",
        type: "text",
        required: true,
        placeholder: "Штук",
        placeholderEn: "Pieces",
      },
    ],
  },
  {
    id: "video-surveillance",
    category: "Инфраструктура",
    categoryEn: "Infrastructure",
    type: "Установка видеонаблюдения",
    typeEn: "Video Surveillance Installation",
    titleTemplate: "Установка системы видеонаблюдения по адресу {address}",
    titleTemplateEn: "Install video surveillance system at {address}",
    descriptionTemplate: `Предлагается установить систему видеонаблюдения по адресу: {address}.

**Количество камер:** {cameras}
**Зоны покрытия:** {zones}
**Тип системы:** {system_type}

Установка видеонаблюдения позволит повысить уровень безопасности на территории, предотвратить акты вандализма и противоправные действия.`,
    descriptionTemplateEn: `It is proposed to install a video surveillance system at the following address: {address}.

**Number of cameras:** {cameras}
**Coverage zones:** {zones}
**System type:** {system_type}

Installing video surveillance will increase the security level in the area, prevent acts of vandalism and illegal actions.`,
    tags: ["видеонаблюдение", "безопасность", "камеры", "двор"],
    parameters: [
      {
        name: "address",
        label: "Адрес",
        labelEn: "Address",
        type: "text",
        required: true,
        placeholder: "Улица, номера домов",
        placeholderEn: "Street, building numbers",
      },
      {
        name: "cameras",
        label: "Количество камер",
        labelEn: "Number of Cameras",
        type: "text",
        required: true,
        placeholder: "Штук",
        placeholderEn: "Pieces",
      },
      {
        name: "zones",
        label: "Зоны покрытия",
        labelEn: "Coverage Zones",
        type: "textarea",
        required: false,
        placeholder: "Входные группы, парковка, детская площадка",
        placeholderEn: "Entrances, parking, playground",
      },
      {
        name: "system_type",
        label: "Тип системы",
        labelEn: "System Type",
        type: "select",
        required: true,
        options: ["Аналоговая", "IP-камеры", "Беспроводная", "Облачная"],
        optionsEn: ["Analog", "IP cameras", "Wireless", "Cloud"],
      },
    ],
  },
  {
    id: "help-elderly",
    category: "Социальные инициативы",
    categoryEn: "Social Initiatives",
    type: "Помощь пожилым и маломобильным",
    typeEn: "Help for Elderly and Mobility-Impaired",
    titleTemplate:
      "Организация помощи пожилым и маломобильным жителям района {district}",
    titleTemplateEn:
      "Organize help for elderly and mobility-impaired residents of {district}",
    descriptionTemplate: `Предлагается организовать систему взаимопомощи для пожилых и маломобильных жителей района: {district}.

**Виды помощи:** {help_types}
**Периодичность:** {frequency}
**Координатор:** {coordinator}
**Количество волонтёров:** {volunteers}

Инициатива направлена на поддержку наиболее уязвимых категорий жителей и развитие соседской взаимопомощи.`,
    descriptionTemplateEn: `It is proposed to organize a mutual aid system for elderly and mobility-impaired residents of the district: {district}.

**Types of help:** {help_types}
**Frequency:** {frequency}
**Coordinator:** {coordinator}
**Number of volunteers:** {volunteers}

The initiative aims to support the most vulnerable categories of residents and develop neighborly mutual aid.`,
    tags: ["помощь", "пожилые", "социальное", "волонтёры"],
    parameters: [
      {
        name: "district",
        label: "Район",
        labelEn: "District",
        type: "text",
        required: true,
        placeholder: "Название района или улицы",
        placeholderEn: "District or street name",
      },
      {
        name: "help_types",
        label: "Виды помощи",
        labelEn: "Types of Help",
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
        optionsEn: [
          "Grocery assistance",
          "Medicine delivery",
          "Apartment cleaning",
          "Accompaniment to doctor",
          "Legal assistance",
          "Comprehensive",
        ],
      },
      {
        name: "frequency",
        label: "Периодичность",
        labelEn: "Frequency",
        type: "select",
        required: true,
        options: [
          "Одноразовая акция",
          "Еженедельно",
          "Ежемесячно",
          "По запросу",
          "Постоянно",
        ],
        optionsEn: [
          "One-time event",
          "Weekly",
          "Monthly",
          "On request",
          "Ongoing",
        ],
      },
      {
        name: "coordinator",
        label: "Координатор",
        labelEn: "Coordinator",
        type: "text",
        required: true,
        placeholder: "Адрес кошелька координатора",
        placeholderEn: "Coordinator's wallet address",
      },
      {
        name: "volunteers",
        label: "Количество волонтёров",
        labelEn: "Number of Volunteers",
        type: "text",
        required: false,
        placeholder: "человек",
        placeholderEn: "people",
      },
    ],
  },
  {
    id: "hobby-group",
    category: "Социальные инициативы",
    categoryEn: "Social Initiatives",
    type: "Создание кружка или секции",
    typeEn: "Create Club or Section",
    titleTemplate: "Создание кружка/секции «{group_name}»",
    titleTemplateEn: "Create club/section «{group_name}»",
    descriptionTemplate: `Предлагается создать кружок или секцию «{group_name}».

**Направление:** {direction}
**Возрастная группа:** {age_group}
**Место проведения:** {place}
**Расписание:** {schedule}
**Ведущий/руководитель:** {leader}

Кружок будет способствовать развитию творческих, спортивных или интеллектуальных способностей участников.`,
    descriptionTemplateEn: `It is proposed to create a club or section «{group_name}».

**Direction:** {direction}
**Age group:** {age_group}
**Venue:** {place}
**Schedule:** {schedule}
**Host/Leader:** {leader}

The club will help develop creative, sports, or intellectual abilities of participants.`,
    tags: ["кружок", "секция", "досуг", "дети"],
    parameters: [
      {
        name: "group_name",
        label: "Название кружка/секции",
        labelEn: "Club/Section Name",
        type: "text",
        required: true,
        placeholder: "Например: «Умелые ручки», «Шахматный клуб»",
        placeholderEn: "E.g.: \"Crafty Hands\", \"Chess Club\"",
      },
      {
        name: "direction",
        label: "Направление",
        labelEn: "Direction",
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
        optionsEn: [
          "Sports",
          "Creative",
          "Intellectual",
          "Musical",
          "Artistic",
          "Technical",
          "Dance",
        ],
      },
      {
        name: "age_group",
        label: "Возрастная группа",
        labelEn: "Age Group",
        type: "select",
        required: true,
        options: [
          "Дети 3–6 лет",
          "Дети 7–12 лет",
          "Подростки 13–17 лет",
          "Взрослые",
          "Смешанная",
        ],
        optionsEn: [
          "Children 3–6 years",
          "Children 7–12 years",
          "Teens 13–17 years",
          "Adults",
          "Mixed",
        ],
      },
      {
        name: "place",
        label: "Место проведения",
        labelEn: "Venue",
        type: "text",
        required: true,
        placeholder: "Адрес или учреждение",
        placeholderEn: "Address or institution",
      },
      {
        name: "schedule",
        label: "Расписание",
        labelEn: "Schedule",
        type: "text",
        required: true,
        placeholder: "Дни недели и время",
        placeholderEn: "Days of the week and time",
      },
      {
        name: "leader",
        label: "Ведущий/руководитель",
        labelEn: "Host/Leader",
        type: "text",
        required: true,
        placeholder: "Адрес кошелька",
        placeholderEn: "Wallet address",
      },
    ],
  },
  {
    id: "multisig-mint",
    category: "Мультикошелек",
    categoryEn: "Multisig",
    type: "Выпуск токенов",
    typeEn: "Token Issuance",
    titleTemplate:
      "Выпуск {amount} жетонов контракта {jettonMinterAddress} на адрес {toAddress}",
    titleTemplateEn:
      "Issue {amount} tokens of contract {jettonMinterAddress} to address {toAddress}",
    descriptionTemplate: `Предлагается выпустить (сминтить) {amount} жетонов контракта {jettonMinterAddress} на адрес {toAddress} через мультикошелек {multisigAddress}.

После завершения голосования с положительным результатом решение можно применить в мультикошельке одной транзакцией.`,
    descriptionTemplateEn: `It is proposed to issue (mint) {amount} tokens of contract {jettonMinterAddress} to address {toAddress} via multisig {multisigAddress}.

After a successful vote, the decision can be applied in the multisig with one transaction.`,
    tags: ["мультикошелек", "минт", "жетоны", "выпуск"],
    parameters: [
      {
        name: "jettonMinterAddress",
        label: "Адрес жетона (minter)",
        labelEn: "Token address (minter)",
        type: "text",
        required: true,
        placeholder: "EQ...",
      },
      {
        name: "amount",
        label: "Количество жетонов (в единицах)",
        labelEn: "Number of tokens (in units)",
        type: "text",
        required: true,
        placeholder: "1000",
      },
      {
        name: "toAddress",
        label: "Адрес получателя",
        labelEn: "Recipient address",
        type: "text",
        required: true,
        placeholder: "EQ...",
      },
      {
        name: "multisigAddress",
        label: "Адрес мультикошелька (администратор жетона)",
        labelEn: "Multisig address (token admin)",
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

export const CATEGORIES_EN = Array.from(
  new Set(TEMPLATES.map((t) => t.categoryEn || t.category)),
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
  lang: string = "ru",
): { title: string; description: string } => {
  const titleTemplate = lang === "en" && template.titleTemplateEn
    ? template.titleTemplateEn
    : template.titleTemplate;
  const descriptionTemplate = lang === "en" && template.descriptionTemplateEn
    ? template.descriptionTemplateEn
    : template.descriptionTemplate;

  let title = titleTemplate;
  let description = descriptionTemplate;

  for (const [key, value] of Object.entries(params)) {
    title = title.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
    description = description.replace(
      new RegExp(`\\{${key}\\}`, "g"),
      value || "",
    );
  }

  return { title, description };
};
