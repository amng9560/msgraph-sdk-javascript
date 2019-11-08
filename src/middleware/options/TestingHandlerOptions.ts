/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.  Licensed under the MIT License.
 * See License in the project root for license information.
 * -------------------------------------------------------------------------------------------
 */

/**
 * @module TestingHandlerOptions
 */

import { MiddlewareOptions } from "./IMiddlewareOptions";
import { TestingStrategy } from "./TestingStrategy";

/**
 * Class representing TestingHandlerOptions
 * @class
 * Class
 * @implements MiddlewareOptions
 */
export class TestingHandlerOptions implements MiddlewareOptions {
	/**
	 * Specifies the startegy used for the Testing Handler -> RAMDOM/MANUAL
	 *
	 * @public
	 */
	public testingStrategy: TestingStrategy;

	/**
	 * Status code to be returned in the response
	 *
	 * @public
	 */
	public statusCode: number;

	/**
	 * The Message to be returned in the response
	 *
	 * @public
	 */
	public statusMessage: string;

	/**
	 * The percentage of randomness/chaos in the handler
	 *
	 * Setting the default value as 10%
	 * @public
	 */
	public chaosPercentage: number;

	/**
	 * @public
	 * @constructor
	 * To create an instance of Testing Handler Options
	 * @param {TestingStrategy} testingStrategy - Specifies the startegy used for the Testing Handler -> RAMDOM/MANUAL
	 * @param {number?} statusCode - The Message to be returned in the response
	 * @param {string} - The Message to be returned in the response
	 * @returns An instance of TestingHandlerOptions
	 */
	public constructor(testingStrategy: TestingStrategy = TestingStrategy.RANDOM, statusCode?: number, statusMessage: string = "Some error Happened", chaosPercentage?: number) {
		this.testingStrategy = testingStrategy;
		this.statusCode = statusCode;
		this.statusMessage = statusMessage;
		this.chaosPercentage = chaosPercentage !== undefined ? chaosPercentage : 10;
		if (this.chaosPercentage > 100) {
			throw new Error("Error Pecentage can not be more than 100");
		}
	}
}
