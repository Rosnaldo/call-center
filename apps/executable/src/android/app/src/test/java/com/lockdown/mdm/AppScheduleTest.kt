package com.lockdown.mdm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar

class AppScheduleTest {

    private fun minute(time: String) = ScheduleStore.parseHourMinute(time)!!

    private val schedule = AppSchedule.parse(
        mapOf(
            "mon" to listOf("14:00" to "18:00", "08:00" to "12:00"),
            "sat" to listOf("10:00" to "11:00"),
            "sun" to emptyList(),
        )
    )!!

    @Test
    fun allowsOnlyInsideTheDaysRanges() {
        assertTrue(schedule.contains(minute("08:00"), Calendar.MONDAY))
        assertTrue(schedule.contains(minute("11:59"), Calendar.MONDAY))
        assertFalse(schedule.contains(minute("12:00"), Calendar.MONDAY))
        assertFalse(schedule.contains(minute("13:00"), Calendar.MONDAY))
        assertTrue(schedule.contains(minute("17:30"), Calendar.MONDAY))
        assertTrue(schedule.contains(minute("10:30"), Calendar.SATURDAY))
    }

    @Test
    fun blocksTheDaysLeftOutOrEmpty() {
        assertFalse(schedule.contains(minute("10:30"), Calendar.TUESDAY))
        assertFalse(schedule.contains(minute("10:30"), Calendar.SUNDAY))
        assertFalse(AppSchedule.parse(emptyMap())!!.contains(minute("10:30"), Calendar.MONDAY))
    }

    @Test
    fun rejectsMalformedSchedules() {
        assertNull(AppSchedule.parse(mapOf("monday" to listOf("08:00" to "12:00"))))
        assertNull(AppSchedule.parse(mapOf("mon" to listOf("8h" to "12:00"))))
        assertNull(AppSchedule.parse(mapOf("mon" to listOf("22:00" to "02:00"))))
        assertNull(AppSchedule.parse(mapOf("mon" to listOf("" to ""))))
    }

    @Test
    fun describesItself() {
        assertEquals("mon 08:00-12:00, 14:00-18:00; sat 10:00-11:00", schedule.toString())
        assertEquals("blocked all week", AppSchedule.parse(emptyMap()).toString())
    }
}
