import React from 'react'

export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <span>GP</span>
      <i />
    </span>
  )
}

export function Brand() {
  return (
    <span className="brand">
      <Mark />
      <span className="brand-copy">
        <strong>Girl Pikin For Betteh</strong>
        <small>Foundation</small>
      </span>
    </span>
  )
}
