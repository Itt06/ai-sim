import { FC, useEffect, useState } from 'react';

import Workplace from 'game/world/Workplace';
import Window from 'hud/Window';
import { ja } from '../../i18n';
import { DetailsWindowProps } from 'types/HUD';
import { summarizePositions } from 'util/positions';

const INITIAL_SIZE = { width: 800, height: 700 };
const REFRESH_MS = 1500;

const WorkplaceDetails: FC<DetailsWindowProps> = ({ game, index, data, z, onFocus, onClose }) => {
    const workplace = data as Workplace;

    const [, setRefresh] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setRefresh(value => value + 1), REFRESH_MS);
        return () => clearInterval(id);
    }, []);

    if (!workplace) {
        return null;
    }

    const business = workplace.getBusiness();
    const employees = workplace.getEmployees();

    if (!business) {
        return (
            <Window game={game} index={index} z={z} onFocus={onFocus} title="空き事業所" testId="window-workplace" initialSize={INITIAL_SIZE} onClose={onClose}>
                <div style={{ padding: '8px' }}><em>ここでは事業が営業していません。</em></div>
            </Window>
        );
    }

    const positions = summarizePositions(business.positions, workplace.getOpenPositions());
    const balance = game.economy?.getBusinessBalance(workplace.getIdentifier());
    // Business-owned object instances (task 047): employer-owned work outputs, wherever they physically sit.
    const stock = game.inventory?.instancesOwnedBy({ kind: 'business', key: workplace.getIdentifier() }) ?? [];

    return (
        <Window game={game} index={index} z={z} onFocus={onFocus} title={business.name} testId="window-workplace" initialSize={INITIAL_SIZE} onClose={onClose}>
            <div style={{ padding: '4px 8px' }}>
                <p><strong>{ja(business.lineOfWork)}</strong> &nbsp; <small>規模 {business.size}</small></p>
                {balance !== undefined && <p><strong>残高:</strong> ${balance.toLocaleString()}</p>}
                {business.lastPnl !== undefined && (
                    <p>
                        <strong>直近の損益:</strong>{' '}
                        <span style={{ color: business.lastPnl >= 0 ? '#7CFC8A' : '#FF7A7A' }}>
                            {business.lastPnl >= 0 ? '+' : '−'}${Math.abs(Math.round(business.lastPnl)).toLocaleString()}/mo
                        </span>
                    </p>
                )}

                <section>
                    <h4>職位</h4>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {positions.map(position => (
                            <li key={position.title}>
                                {ja(position.title)}: <strong>{position.filled}/{position.total}</strong>人就業
                                {position.open > 0 ? <small>（空き {position.open}）</small> : null}
                            </li>
                        ))}
                    </ul>
                </section>

                {stock.length > 0 && (
                    <section>
                        <h4>在庫（{stock.length}）</h4>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {stock.slice(0, 12).map(instance => (
                                <li key={instance.id}>
                                    {ja(game.inventory?.getArchetype(instance.archetypeId)?.label ?? instance.archetypeId)}
                                    {instance.quantity > 1 ? ` ×${instance.quantity}` : ''}
                                </li>
                            ))}
                            {stock.length > 12 && <li><em>…ほか{stock.length - 12}件</em></li>}
                        </ul>
                    </section>
                )}

                <section>
                    <h4>従業員（{employees.length}）</h4>
                    {employees.length ? (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {employees.map((employee, employeeIndex) => (
                                <li
                                    key={employeeIndex}
                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={() => game.emit('PersonSelected', employee)}
                                >
                                    {employee.social.getFullName()} — <small>{ja(employee.work.getJob()?.title ?? '—')}</small>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p><em>従業員はいません。</em></p>
                    )}
                </section>
            </div>
        </Window>
    );
};

export default WorkplaceDetails;
