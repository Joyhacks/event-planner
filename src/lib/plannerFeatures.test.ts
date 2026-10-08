import { describe, expect, it } from 'vitest'
import { createSampleEvent } from '../data/sample'
import { backupJson, parseBackup, parsePlannerEvent, restoredCopy, validDate } from './plannerBackup'
import { importGuestsCsv, parseCsv } from './guestImport'
import { safeNext } from './safeNext'
import { asoebiStats, budgetStats } from './stats'
import { validateEventForm, emptyEventForm } from './eventForm'

describe('backup and restore', () => {
  it('round-trips legacy data without losing paid amounts', () => {
    const event = createSampleEvent()
    const restored = parseBackup('\uFEFF' + backupJson([event]))[0]!
    expect(restored.guests).toEqual(event.guests)
    expect(asoebiStats(restored.asoebi)).toEqual(asoebiStats(event.asoebi))
  })
  it('restores independently so editing a copy cannot overwrite shared records', () => {
    const event = parsePlannerEvent(createSampleEvent())
    const copy = restoredCopy(event)
    expect(copy.id).not.toBe(event.id)
    expect(copy.guests[0]?.id).not.toBe(event.guests[0]?.id)
    expect(copy.asoebi?.buyers[0]?.id).not.toBe(event.asoebi?.buyers[0]?.id)
    expect(copy.isSample).toBe(false)
    expect(parsePlannerEvent(copy).title).toContain('(restored)')
  })
  it('rejects unsupported versions and duplicate child identifiers', () => {
    expect(() => parseBackup('{"format":"ariya-planner","version":2,"events":[]}')).toThrow()
    const event = createSampleEvent()
    event.guests.push(event.guests[0]!)
    expect(() => parsePlannerEvent(event)).toThrow(/Duplicate/)
  })
  it('rejects invalid dates, colors, excessive counts and non-integer amounts', () => {
    expect(validDate('2027-02-30')).toBe(false)
    expect(validDate('0000-01-01')).toBe(false)
    for (const patch of [
      { date: '2027-02-30' },
      { startTime: '29:99' },
      { budget: Infinity },
      { budget: 0.5 },
      { guestTarget: 20001 },
    ])
      expect(() => parsePlannerEvent({ ...createSampleEvent(), ...patch })).toThrow()
    const event = createSampleEvent()
    event.asoebi!.colors = ['url(https://invalid.test)']
    expect(() => parsePlannerEvent(event)).toThrow(/colour/)
  })
  it('discards unrecognised imported fields', () => {
    expect(parsePlannerEvent({ ...createSampleEvent(), created_by: 'someone-else', role: 'owner' })).not.toHaveProperty(
      'created_by',
    )
  })
})

describe('CSV guest imports', () => {
  it('reads quoted commas, escaped quotes, newlines and a BOM', () => {
    expect(parseCsv('\uFEFFName,Phone\r\n"Ada, ""A""\nOkafor",0800')).toEqual([
      ['Name', 'Phone'],
      ['Ada, "A"\nOkafor', '0800'],
    ])
  })
  it('maps exported RSVP labels, counts seats and skips duplicates', () => {
    const { guests, skipped } = importGuestsCsv(
      'Name,Phone,Group,RSVP,Plus ones\nAda,0800,Family,Coming,2\nAda,0800,family,yes,2\nTobi,,faith,Maybe,0',
    )
    expect(guests).toHaveLength(2)
    expect(skipped).toBe(1)
    expect(guests[0]).toMatchObject({ plusOnes: 2, rsvp: 'yes', group: 'family' })
    expect(guests[1]?.rsvp).toBe('maybe')
  })
  it('validates the entire file before returning any records', () => {
    expect(() => importGuestsCsv('Name,Plus ones\nAda,0\nTobi,21')).toThrow(/Row 3/)
    expect(() => importGuestsCsv('Name,RSVP\nAda,definitely')).toThrow()
    expect(() => parseCsv('Name\n"unclosed')).toThrow(/unclosed/)
    expect(() => importGuestsCsv('Email\na@b.test')).toThrow(/Name/)
    expect(() => importGuestsCsv('Name,Name\nAda,Tobi')).toThrow(/duplicate/)
  })
})

describe('payment records', () => {
  it('does not use one overpayment to hide another person’s debt', () => {
    expect(
      asoebiStats({
        fabric: 'x',
        colors: [],
        payTo: '',
        pricePerSet: 100,
        buyers: [
          { id: '1', name: 'A', sets: 1, paid: true, collected: false, amountPaid: 200 },
          { id: '2', name: 'B', sets: 1, paid: false, collected: false, amountPaid: 0 },
        ],
      }).owing,
    ).toBe(100)
    expect(
      budgetStats(
        [
          { id: '1', category: 'venue', label: 'Hall', planned: 100, paid: 200 },
          { id: '2', category: 'catering', label: 'Food', planned: 100, paid: 0 },
        ],
        200,
      ).outstanding,
    ).toBe(100)
  })
  it('counts deposits and actual receipts instead of a paid checkbox', () => {
    const event = createSampleEvent()
    event.asoebi = {
      fabric: 'Fabric',
      colors: [],
      payTo: '',
      pricePerSet: 100,
      buyers: [
        { id: crypto.randomUUID(), name: 'Ada', sets: 2, paid: false, collected: false, amountPaid: 50 },
        { id: crypto.randomUUID(), name: 'Tobi', sets: 1, paid: false, collected: true, amountPaid: 100 },
      ],
    }
    expect(asoebiStats(event.asoebi)).toMatchObject({ expected: 300, received: 150, owing: 150, collected: 1 })
    const restored = parsePlannerEvent(event)
    expect(restored.asoebi?.buyers[1]?.paid).toBe(true)
  })
})

describe('login redirects and event inputs', () => {
  it('keeps login redirects on the app origin', () => {
    for (const path of [null, 'https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test'])
      expect(safeNext(path)).toBe('/app')
    expect(safeNext('/app/events/123?tab=guests')).toBe('/app/events/123?tab=guests')
  })
  it('blocks impossible dates and amounts before creating an unsyncable event', () => {
    const result = validateEventForm({
      ...emptyEventForm(),
      title: 'Party',
      date: '2027-02-30',
      budget: '2000000000000',
      startTime: '29:99',
    })
    expect(result.input).toBeNull()
    expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(['date', 'budget', 'startTime']))
  })
})
