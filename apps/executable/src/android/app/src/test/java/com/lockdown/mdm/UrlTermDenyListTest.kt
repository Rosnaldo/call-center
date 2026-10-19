package com.lockdown.mdm

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UrlTermDenyListTest {

    private val semi = UrlTermDenyList.wholeWord("semi")

    private fun blocked(text: String) = assertTrue(text, semi.containsMatchIn(text))
    private fun allowed(text: String) = assertFalse(text, semi.containsMatchIn(text))

    @Test
    fun matchesTheWholeWord() {
        blocked("semi")
        blocked("Semi nua")
        blocked("semi-nua")
        blocked("google.com/search?q=semi+nua")
        blocked("fotos SEMI")
    }

    @Test
    fun ignoresWordsThatContainIt() {
        allowed("seminario")
        allowed("semifinal")
        allowed("semiótica")
        allowed("semi2")
        allowed("2semi")
        allowed("anemia semínima")
    }

    @Test
    fun escapesRegexSyntaxInTerms() {
        val term = UrlTermDenyList.wholeWord("a.b")
        assertTrue(term.containsMatchIn("busca a.b"))
        assertFalse(term.containsMatchIn("busca axb"))
    }
}
