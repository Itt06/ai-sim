import { FC, useEffect, useState } from 'react';

import GameManager from 'game/GameManager';
import { Timestamp, TimeChangedEvent } from 'types/Time';
import { formatTimestamp, WEEKDAY_NAMES } from 'util/time';

interface ClockProps {
    game: GameManager;
}

// A small persistent date/time widget. It seeds from the clock once and then updates purely from the
// `timeChanged` event bus signal (no polling of game internals), per the task's UI requirement.
const Clock: FC<ClockProps> = ({ game }) => {
    const [timestamp, setTimestamp] = useState<Timestamp | null>(game.clock?.getTimestamp() ?? null);

    useEffect(() => {
        game.on('timeChanged', {
            callback: (event: TimeChangedEvent) => setTimestamp(event.timestamp),
        });
        return () => {
            game.off('timeChanged');
        };
    }, [game]);

    if (!timestamp) {
        return null;
    }

    // Presentation-only weekday label (task 057): "mon" -> "Mon".
    const weekdayName = WEEKDAY_NAMES[timestamp.dayOfWeek] ?? '';
    const weekdayLabel = ({ mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' } as Record<string, string>)[weekdayName] ?? weekdayName;

    // Clicking the clock opens the city overview dashboard (task 031).
    return (
        <div
            className="clock-widget glass"
            data-testid="clock-widget"
            style={{ cursor: 'pointer' }}
            title="街の概要を開く"
            onClick={() => game.emit('CitySelected', game.city)}
        >
            {weekdayLabel ? `${weekdayLabel} · ` : ''}{formatTimestamp(timestamp)}
        </div>
    );
};

export default Clock;
