---
title: "Simple ROP"
tags: [ROP, Return Oriented Programming]
---

# Simple Return Oriented Programming

For my first blog post in CyberSecurity, we'll be taking a look at a very simple example of Return Oriented Programming. Return Oriented Programming (or ROP) is a method of gaining code execution on a system that has protection against systems which use executable space protection (the no-execute bit). Also, according to Wikipedia, it can also bypass code-signing (a method of ensuring that code has not been altered since the executable was signed).

For our first example, we have a demo program where the program takes in arbitrary data as a program argument. I pasted the program below, but stripped many comments to make it fit without scrolling. If you want a downloadable version of the program with all of the comments, you can find it [here][vuln-program].

```c
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

// The Vulnerable Function To Exploit
void vuln(char *exploit_string) {
	int buffer_size = 32;
	char buffer[buffer_size];

	strcpy(buffer, exploit_string);
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
		printf("Please Call %s <exploit-code>\n", argv[0]);
	}

	return 0;
}
```

The goal is to execute the `shell()` function by using the input from the command line arguments.

### Compiling
To compile this sample program, we will save the C program as rop.c and then run the command `gcc -m32 -ggdb -fno-stack-protector rop.c -o rop`. The -m32 flag tells gcc to compile the program for 32 bit, -ggdb tells gcc to include debug symbols, -fno-stack-protector tells gcc not to include the stack canary protection (although it appears that it doesn't add it anyway for this particular example), and -o just tells gcc what to name the output file (otherwise it'd default to a.out).

The only required flag is -m32 as I have yet to figure out how to get any data into the RIP register when the program is 64 bit. -ggdb allows the debugger to be able to associate the source code of the program with the program so you can see the source code while debugging.

As for stack protection, normally, if you have a character array of 8 bytes or more (sometimes even 4 bytes or more depending on the implementation), gcc would apply a canary word to determine if a buffer overflow occured. For the sake of simplicity we disabled that as we don't want to have the program shut itself off if we overwrite the canary value.

### Explanation Of Memory
To get into actually exploiting the program, we need to find a place where the program doesn't properly check the data. In our case, that function is strcpy. The strcpy command doesn't verify the input data is less than the size of the buffer we are storing the data into, so given a large enough amount of data, the data will start overwriting other data on the stack. The stack being the place where temporary data is stored (including return pointers which tells the program which function to return to when done). Code itself shouldn't be sitting on the stack, so in a properly configured system, the stack won't have executable permission.

For example, the below screenshot shows what permissions are set for the stack as well as the portion where the code lies. The stack has rw-p set. The r/w means read/write, the p means private, and the dash would be set to an x if the stack could run code. The x you see on the line that starts with 56556000 is where the program's code lies and we'll be calling the shell function inside of that page (pages tend to be mapped to 4 KB on Linux, but that's not important for this particular example).

[![Screenshot Of No Execute Bit On Stack][no-execute-bit-image]][no-execute-bit-image]

Normally, when the program loads, the system will randomize the location of the program's pages as well as the position of the stack and other important areas of the program. This method of obscuring the memory of the program is called Address Space Layout Randomization (ASLR) and its purpose is to make it harder for an attacker to find a usable address to jump to if a successful overflow was performed. ASLR can be defeated through methods such as an improperly implemented printf statement, however, we are going to just disable ASLR for our specific program so we don't have to play guessing games where the shell function is located in memory. The gdb debugger disables ASLR by default, so if you did want to turn it on you can send the command `set disable-randomization off` to gdb's shell.

### Finding The Exploitable Address

With ASLR disabled, we don't have to find the address of the shell function while performing the exploit, so we'll make sure to write down the address we want to trick the program into returning to now before finding out how to construct the payload. For my specific gdb, I installed [pwndebug][pwndebug] as I heard it was very useful for helping to develop exploits for programs. At the very least, being able to see all the registers when stepping through a program is very, very useful and we'll be using that feature today. With vanilla gdb, you'd need to run the command `info registers` to see the registers.

To start gdb, run the command `gdb ./rop` in your shell. This won't start the program immediately, so you'll have to do that with the `run` command. It helps to know that before you start the program, any addresses you get for any functions will most likely be wrong. As this particular program exits without waiting on user input, we'll need a way to stop it from running before it exits. For me, I just set the breakpoint to the `vuln` function by running the command `b vuln` before I ran the program. However, you can set it to `b main` if you'd like to. When setting the breakpoint to vuln, you'll need to pass an argument to the program, so it'll call vuln. To run the program with command line arguments, send the command `run your-argument-here` (or without arguments, it's just `run`).

Once the breakpoint is hit, gdb will automatically go back to its shell. You can now run the command `disassemble shell` to see a list of addresses for the instructions inside the shell function. We want to jump to the first address in this example, so we'll copy and paste the 0xWHATEVER address for future reference. The number is probably 0x56556226 unless the program was modified or the compiler built the program differently.

The screenshot below shows what the address looks like on my end. There's a <+0> next to the address to signify that it's the first instruction in that function.

[![Screenshot Of Disassemble Shell Command][disassemble-shell-image]][disassemble-shell-image]

### Determining The Exploit Payload's Length

Now that we have determined the address we want to jump to, we can quit gdb by either pressing Ctrl+D or by sending the `quit` command.

What we now want to do is determine what the payload length needs to be in order to be able to overwrite the return pointer that will be called when the vulnerable function returns to the function that calls it.

We already know from reading the source code that the buffer is 32 bytes long. So, the test payload will need to be at least 33 bytes long. As there'll be other data between the buffer and stack pointer, it's not going to be 33 bytes. I'm not entirely sure what's in between the pointer and buffer as I haven't fully investigated into how exactly the stack is setup yet. There is a StackOverflow [answer][stackoverflow-stack-frame] about how stack frames are organized, if you want to read further into how exactly a stack frame is organized.

When we overflow the buffer to determine the stack pointer's location relative to the beginning of the buffer, we can use a non-repeating string of characters like below. The below string just being the alphabet in uppercase, then lowercase, then numbers. After that, the whole string is mirrored. The idea is that, you'll probably see at least 3 of 4 characters when looking at the registers in the debugger and given the non-repeating nature of the string, you'll know exactly where in the string a register is reading its data from. I meantion this as at first, I used to just use a bunch of capital A's and then it became a guessing game of, where in the string is the pointer reading from? So, while it may seem obvious to use a non-repeating string in hindsight, but it may not be obvious at first.


```
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567899876543210zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA
```

Once we have our non-repeating string to overflow the buffer with, we want to either start the program with `run your-test-string` or ``run `cat your-test-string.txt` ``.

Thankfully, for this simple example, no breakpoints were needed as well, the invalid return address causes a segfault exactly where we wanted to end up. More info will be provided below about how to find out the return address even if a program doesn't segfault exactly where you want it to.

In the screenshot below, you'll see the address 0x38393938 in the register EIP. The EIP is the instruction pointer, which has the address for the next instruction to be ran. The 64 bit equivalent of EIP is [RIP][os-dev-registers]. With pwndebug, you'll also see the string `8998`. That string let's you know where exactly in the payload the shell function's return address needs to be placed. We can find out that the string before `8998` is 60 characters long.

[![Screenshot Of Finding Payload Length][finding-payload-length-image]][finding-payload-length-image]

The -n flag on echo just tells echo not to put a newline in the output so we don't have the linefeed character adding an extra byte to the byte count. The -c flag counts the number of bytes.

```bash
echo -n "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567" | wc -c
```

In the event that the program did not stop executing at the correct location, you can get to the correct location by putting a breakpoint on vuln, then disassembling vuln to find the last instruction in the function, which should be `ret`. After that, you would set a breakpoint for the return instruction. For this example, the address is 0x56556225 and the breakpoint command is `b *0x56556225`. The * tells gdb that you want to breakpoint on that address (as opposed to a function name). Then you'd run the command `continue` to continue execution until the breakpoint you specified. After that, you'd type `step` to step forward one more instruction, and you'd then get the same result as we did above.

[![Screenshot Of Disassemble Vuln Command][disassemble-vuln-image]][disassemble-vuln-image]

### Making The Payload
Now that we know the payload must have 60 bytes before the shell function's address, we can create the payload. Using the address we previously stored for the shell function, 0x56556226, and the 60 bytes, we can produce the below script for Python 3. I'm not entirely sure the exact rules for what should or shouldn't be in the payload, but I do know that due to strcpy terminating on the first null byte it sees, we can't use \x00 and due to the payload being inserted in as a function argument, we can't use spaces (\x20). I have not found any other bytes that can't be used. I've used both capital A and \x90 for the payload buffer. \x90 means NOP (no operation) on x86_64 processors.

As for the bytes right after the first 60 bytes, we take a look at what order we need to put the bytes in. As x86 processors are [little endian][x86-endianness], they store words (4 bytes) backwards. As for how exactly this translates from the perspective of writing the payload is currently something I do not know. You can refer to this [StackOverflow answer][stack-growth] if you'd like. I figured out the order of the address by dumping the stack and looking for the return address near the test payload. I'll have to explain how memory dumps work in a later post, but I want to make sure I know more about how exactly the stack works and how data is organized before I write about it.

For our example, we'd take the 0x56556226, split it up into 0x56, 0x55, 0x62, and 0x26. We'd then write it backwards as 0x26, 0x62, 0x55, 0x56. We can then insert the data into Python and we'd have our payload generating script.

I purposely chose `sys.stdout.buffer.write` as it doesn't cause problems by trying to insert bytes between our bytes due to assuming we are printing a string.

```python
import sys;

for i in range(1,61):
	sys.stdout.buffer.write(b"\x90")

# 0x56556226
sys.stdout.buffer.write(b"\x26\x62\x55\x56")
```

### Executing The Payload
Now we want to execute the payload. We can run the program in the debugger if we want, but gdb will assume the program died after running your first shell command. So, to check out our new payload, we can run this outside of the debugger. In order for this payload to work, we'll need to disable ASLR for the program's runtime (as well, we won't have the debugger to do it for us). To disable ASLR, we'll use the setarch command to run the program. Using setarch, we can disable ASLR using the -R flag. After that, we run the program with the output from the Python script supplied as the first argument.

```bash
setarch -R ./rop `python3 payload.py`
```

[![Screenshot Of Executing Payload][executing-payload-image]][executing-payload-image]

There is a segfault that occurs after the shell is exited, but I haven't bothered to figure out what instructions are causing the segfault as at this point, the payload runs. I may spend some time in the future working out exactly why the segfault occurs (probably using the `backtrace` command), so I can fix it.

I also wanted to mention, I was originally going to have a couple of printf statements that read the data from the payload, but the printf statements caused segfaults before returning from the function, and working around those segfaults would've been a bit more challenging than I wanted the tutorial to be. I discovered the segfault was caused by printf checking the length of our payload through the use of the `backtrace` command.


[vuln-program]: /teaching_files/rop_no_chain/rop.c
[pwndebug]: https://github.com/pwndbg/pwndbg
[stackoverflow-stack-frame]: https://stackoverflow.com/a/10057535/6828099
[os-dev-registers]: https://wiki.osdev.org/CPU_Registers_x86-64#Pointer_Registers
[x86-endianness]: https://stackoverflow.com/a/25939262/6828099
[stack-growth]: https://stackoverflow.com/a/1691818/6828099

[no-execute-bit-image]: /images/Simple_ROP/no_execute_bit_demo.png
[disassemble-shell-image]: /images/Simple_ROP/disassemble_shell.png
[finding-payload-length-image]: /images/Simple_ROP/finding_payload_length.png
[disassemble-vuln-image]: /images/Simple_ROP/disassemble_vuln.png
[executing-payload-image]: /images/Simple_ROP/executing_payload.png
