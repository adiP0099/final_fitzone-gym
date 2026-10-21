import { useEffect, useRef, useState } from 'react'

const TRACK_INSET = 12
const MIN_THUMB_HEIGHT = 86

const initialMetrics = {
  visible: false,
  top: 0,
  height: 0,
  travel: 0,
  maxScroll: 0,
  percentage: 0,
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getScrollElement() {
  return document.scrollingElement || document.documentElement
}

export default function DumbbellScrollbar() {
  const [metrics, setMetrics] = useState(initialMetrics)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const metricsRef = useRef(initialMetrics)
  const dragRef = useRef(null)
  const instantScrollFrameRef = useRef(0)

  useEffect(() => {
    const root = document.documentElement
    let frameId = 0

    function measure() {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        const scrollElement = getScrollElement()
        const viewportHeight = window.innerHeight
        const trackHeight = Math.max(0, viewportHeight - TRACK_INSET * 2)
        const scrollHeight = Math.max(scrollElement.scrollHeight, viewportHeight)
        const maxScroll = Math.max(0, scrollHeight - viewportHeight)
        const visible = maxScroll > 1 && trackHeight > MIN_THUMB_HEIGHT
        const height = visible
          ? Math.min(trackHeight, Math.max(MIN_THUMB_HEIGHT, trackHeight * viewportHeight / scrollHeight))
          : 0
        const travel = Math.max(0, trackHeight - height)
        const scrollTop = clamp(scrollElement.scrollTop, 0, maxScroll)
        const percentage = maxScroll > 0 ? Math.round(scrollTop / maxScroll * 100) : 0
        const nextMetrics = {
          visible,
          top: maxScroll > 0 ? scrollTop / maxScroll * travel : 0,
          height,
          travel,
          maxScroll,
          percentage,
        }

        metricsRef.current = nextMetrics
        setMetrics(nextMetrics)
        root.classList.toggle('fit-scrollbar-active', visible)
      })
    }

    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizeObserver?.observe(root)
    if (document.body) resizeObserver?.observe(document.body)

    measure()

    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      resizeObserver?.disconnect()
      if (frameId) window.cancelAnimationFrame(frameId)
      root.classList.remove('fit-scrollbar-active')
      root.classList.remove('fit-scrollbar-instant-scroll')
      document.body?.classList.remove('fit-scrollbar-dragging')

      const activeDrag = dragRef.current
      dragRef.current = null
      if (instantScrollFrameRef.current) window.cancelAnimationFrame(instantScrollFrameRef.current)
      if (activeDrag && thumbRef.current?.hasPointerCapture(activeDrag.pointerId)) {
        thumbRef.current.releasePointerCapture(activeDrag.pointerId)
      }
    }
  }, [])

  function scrollToPosition(scrollTop, keepInstant = false) {
    const root = document.documentElement
    root.classList.add('fit-scrollbar-instant-scroll')
    const scrollElement = getScrollElement()
    scrollElement.scrollTop = clamp(scrollTop, 0, metricsRef.current.maxScroll)
    if (!keepInstant) {
      if (instantScrollFrameRef.current) window.cancelAnimationFrame(instantScrollFrameRef.current)
      instantScrollFrameRef.current = window.requestAnimationFrame(() => {
        instantScrollFrameRef.current = 0
        if (!dragRef.current) root.classList.remove('fit-scrollbar-instant-scroll')
      })
    }
  }

  function handleTrackPointerDown(event) {
    if (event.target === thumbRef.current || thumbRef.current?.contains(event.target)) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.preventDefault()
    const track = trackRef.current
    const currentMetrics = metricsRef.current
    if (!track || currentMetrics.travel <= 0) return

    const trackTop = track.getBoundingClientRect().top
    const thumbTop = event.clientY - trackTop - currentMetrics.height / 2
    const percentage = clamp(thumbTop / currentMetrics.travel, 0, 1)
    scrollToPosition(percentage * currentMetrics.maxScroll)
  }

  function handleThumbPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: getScrollElement().scrollTop,
    }
    if (instantScrollFrameRef.current) window.cancelAnimationFrame(instantScrollFrameRef.current)
    instantScrollFrameRef.current = 0
    document.documentElement.classList.add('fit-scrollbar-instant-scroll')
    document.body.classList.add('fit-scrollbar-dragging')
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleThumbPointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const currentMetrics = metricsRef.current
    if (currentMetrics.travel <= 0) return

    const scrollDelta = (event.clientY - drag.startY) / currentMetrics.travel * currentMetrics.maxScroll
    scrollToPosition(drag.startScrollTop + scrollDelta, true)
  }

  function finishDragging(event) {
    if (!dragRef.current || event.pointerId !== dragRef.current.pointerId) return
    dragRef.current = null
    if (instantScrollFrameRef.current) window.cancelAnimationFrame(instantScrollFrameRef.current)
    instantScrollFrameRef.current = 0
    document.documentElement.classList.remove('fit-scrollbar-instant-scroll')
    document.body.classList.remove('fit-scrollbar-dragging')
    setDragging(false)
  }

  function handleKeyDown(event) {
    const scrollElement = getScrollElement()
    const pageStep = Math.max(80, scrollElement.clientHeight * .9)
    let nextScrollTop

    switch (event.key) {
      case 'ArrowUp':
        nextScrollTop = scrollElement.scrollTop - 40
        break
      case 'ArrowDown':
        nextScrollTop = scrollElement.scrollTop + 40
        break
      case 'PageUp':
        nextScrollTop = scrollElement.scrollTop - pageStep
        break
      case 'PageDown':
      case ' ':
        nextScrollTop = scrollElement.scrollTop + pageStep
        break
      case 'Home':
        nextScrollTop = 0
        break
      case 'End':
        nextScrollTop = metricsRef.current.maxScroll
        break
      default:
        return
    }

    event.preventDefault()
    scrollToPosition(nextScrollTop)
  }

  if (!metrics.visible) return null

  return <div className="fit-scrollbar" ref={trackRef} onPointerDown={handleTrackPointerDown}>
    <div
      ref={thumbRef}
      className={`fit-scrollbar-thumb${dragging ? ' is-dragging' : ''}`}
      role="scrollbar"
      aria-label="Page scrollbar"
      aria-controls="root"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={metrics.percentage}
      aria-valuetext={`${metrics.percentage}% scrolled`}
      tabIndex={0}
      style={{ top: `${metrics.top}px`, height: `${metrics.height}px` }}
      onPointerDown={handleThumbPointerDown}
      onPointerMove={handleThumbPointerMove}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      onLostPointerCapture={finishDragging}
      onKeyDown={handleKeyDown}
    >
      <svg viewBox="0 0 48 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <g stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round">
          <rect x="20" y="14" width="8" height="92" rx="4" fill="#38342f" />
          <rect className="dumbbell-plate" x="10" y="4" width="28" height="20" rx="5" fill="var(--paper)" />
          <rect className="dumbbell-plate" x="5" y="11" width="38" height="15" rx="4" fill="var(--paper)" />
          <rect x="11" y="24" width="26" height="7" rx="3" fill="#38342f" />
          <rect className="dumbbell-grip" x="16" y="28" width="16" height="64" rx="8" fill="var(--orange)" />
          <path d="M20 42v36M24 40v40M28 42v36" fill="none" stroke="var(--orange-bright)" strokeWidth="1.5" opacity=".75" />
          <rect x="11" y="89" width="26" height="7" rx="3" fill="#38342f" />
          <rect className="dumbbell-plate" x="5" y="94" width="38" height="15" rx="4" fill="var(--paper)" />
          <rect className="dumbbell-plate" x="10" y="101" width="28" height="15" rx="5" fill="var(--paper)" />
        </g>
      </svg>
    </div>
  </div>
}