"use client";

import { Team } from "@/lib/types";

interface TeamButtonProps {
  team: Team | null;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function TeamButton({ team, isSelected, onClick, disabled, size = "md" }: TeamButtonProps) {
  if (!team) {
    return (
      <div className={`team-btn team-btn-${size} team-btn-empty`}>
        <span className="text-gray-500 text-xs italic">TBD</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`team-btn team-btn-${size} ${isSelected ? "team-btn-selected" : "team-btn-default"}`}
      style={
        isSelected
          ? { background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})`, borderColor: team.primaryColor }
          : {}
      }
    >
      <span className="team-seed">({team.seed})</span>
      <span className="team-name">{team.name}</span>
      <span className="team-abbr">{team.abbreviation}</span>
    </button>
  );
}
