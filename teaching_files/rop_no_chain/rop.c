#include <string.h> // strcpy
#include <stdlib.h> // system
#include <stdio.h>  // printf (or if you fancy, puts)

// If you find another (unintended) vulnerability, please let me know so I can fix it.
// The goal is to teach how to write secure code and find security problems with code.
// You can make a PR and have your name engraved as someone who contributed to helping cybersecurity
//   in the commit history forever if you'd like.

// The Vulnerable Function To Exploit
void vuln(char *exploit_string) {
	int buffer_size = 32;
	char buffer[buffer_size];

	// Solution To Exploit: Check Length Of Strings (+1 includes the NULL Terminator)
// 	int exploit_string_length = strlen(exploit_string);
// 	if ((exploit_string_length+1) > buffer_size) {
// 		printf("Absolutely Not!!!\n");
// 		return;
// 	}

	// Vulnerable Function
	// Note: strncpy is not a safe function, it doesn't add the NULL Terminator at the end as it was designed for fixed length fields.
	// strncpy was never designed for security purposes. If you want security, check the size of your strings before copying them.
	// https://stackoverflow.com/questions/1258550/why-should-you-use-strncpy-instead-of-strcpy#comment1085703_1258556
	strcpy(buffer, exploit_string);

	// Removed to make the debugging tutorial easier for the first tutorial as printf will cause a segfault
	//   when checking the string length unless it has a valid string address (as opposed to segfaulting when we want it to).
// 	printf("Copied String: %s\n", buffer);
// 	printf("Copied String Length: %lu\n", exploit_string_length);
}

// The Shell We Want To Call Via Return Oriented Programming
void shell() {
	system("sh");
}

// The Main Function
int main(int argc, char **argv) {
	if(argc >= 2) {
		vuln(argv[1]);
	} else {
		// printf has it's own vulnerabilities if not used right, but that's a topic for another day (when dealing with ASLR)
		printf("Please Call %s <exploit-code>\n", argv[0]);
	}

	return 0;
}
