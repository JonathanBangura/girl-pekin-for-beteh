import React from 'react'

export function Mark() {
  return (
    <span className="mark v2-mark" aria-hidden="true">
      <span>GP</span>
      <i />
    </span>
  )
}

export function Brand() {
  return (
    <span className="brand v2-brand">
      <Mark />
      <span className="brand-copy">
        <strong>Girl Pikin For Betteh</strong>
        <small>Foundation</small>
      </span>
    </span>
  )
}
