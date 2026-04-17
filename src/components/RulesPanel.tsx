"use client";

export default function RulesPanel() {
  return (
    <section className="rules-panel" aria-labelledby="rules-panel-heading">
      <div className="rules-panel-header">
        <h2 id="rules-panel-heading" className="rules-panel-title">
          Scoring System
        </h2>
        <p className="rules-panel-sub">
          Here&apos;s how points are awarded each round. Pick winners, predict
          series length, and call the Finals MVP.
        </p>
      </div>

      <div className="rules-panel-card">
        <table className="scoring-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Correct Winner</th>
              <th># of Games</th>
              <th>Upset Bonus</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>First Round</td>
              <td>1 pt</td>
              <td>1 pt</td>
              <td>1 pt</td>
            </tr>
            <tr>
              <td>Conf. Semis</td>
              <td>3 pts</td>
              <td>2 pts</td>
              <td>3 pts</td>
            </tr>
            <tr>
              <td>Conf. Finals</td>
              <td>6 pts</td>
              <td>3 pts</td>
              <td>6 pts</td>
            </tr>
            <tr>
              <td>NBA Finals</td>
              <td>12 pts</td>
              <td>5 pts</td>
              <td>12 pts</td>
            </tr>
            <tr className="scoring-table-mvp-row">
              <td>Finals MVP</td>
              <td className="scoring-table-mvp-points">15 pts</td>
              <td className="scoring-table-na">&mdash;</td>
              <td className="scoring-table-na">&mdash;</td>
            </tr>
          </tbody>
        </table>

        <ul className="rules-panel-notes">
          <li>
            <strong>Upset bonus:</strong> awarded when a lower seed beats a
            higher seed.
          </li>
          <li>
            <strong>Games points:</strong> only awarded when the winner pick is
            correct.
          </li>
          <li>
            <strong>Finals MVP:</strong> type the player name — it autocompletes
            from the rosters of the two Finals teams you picked.
          </li>
        </ul>
      </div>
    </section>
  );
}
