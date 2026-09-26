# Этап 1. Основы языка

> ⏱ Время: 2 недели  
> 🎯 Цель: **основы** синтаксиса

## Введение

Метод `__init__` и `**kwargs` в коде, а __жирный__ и _курсив_ вне кода; snake_case_name остаётся как есть.
Экранированный \`не код\` и \*звёздочки\*. Ссылка <https://example.com> и голая https://docs.python.org/3/.
Сущность &amp; и <kbd>Ctrl</kbd>+<kbd>C</kbd>.  
Строка после жёсткого переноса. Ссылки: [второй пример](#пример-1), [окружение](stage-00-environment.md#установка-uv), [шаблон](../templates/demo/), [сайт](//example.org/x).

```bash
## это не заголовок
echo "hi"
```

## Пример

1. Установи зависимости:
   ```bash
   uv sync
   ```
2. Проверь:
   - вложенный пункт
   - [x] сделано
   - [ ] не сделано
3. Готово

## Пример

| Команда | Время | Итог |
|:--|:-:|--:|
| `a \| b` | 1 | |
| `some_really_long_identifier_name_that_does_not_wrap_anywhere_at_all_in_this_table_cell` | 2 | ok |

### Детали `code`

<img src="missing.png" onerror="window.__xss=1">
<a href="java&#x09;script:window.__xss=3">плохая ссылка</a>
<script>window.__xss=2</script>

## Toc

Заголовок с тем же id, что у панели оглавления.

## Пример

```python
@dataclass
class A:
    def __init__(self, x: int = 42) -> None:
        self.x = "s"  # комментарий
```
