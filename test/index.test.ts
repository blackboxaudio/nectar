import { describe, expect, it } from '@jest/globals'

import { empty } from '../src'

describe('File: index.ts', () => {
    describe('Function: empty', () => {
        it('should do nothing', () => {
            expect(empty()).toBeUndefined()
        })
    })
})
