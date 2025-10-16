// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GreeterBase {
    string private _greeting;

    event GreetingChanged(string oldGreeting, string newGreeting);

    constructor(string memory initialGreeting) {
        _greeting = initialGreeting;
        emit GreetingChanged("", initialGreeting);
    }

    function greet() external view returns (string memory) {
        return _greeting;
    }

    function setGreeting(string calldata newGreeting) external {
        string memory old = _greeting;
        _greeting = newGreeting;
        emit GreetingChanged(old, newGreeting);
    }
}
