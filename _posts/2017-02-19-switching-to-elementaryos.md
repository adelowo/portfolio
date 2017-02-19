---

layout : post
description : Elementary os is the new cool
tags : linux
title : Elementary OS - the beauty and the beast

---

I recently switched to Elementary OS for my desktop computing needs and i am - to say the least - extremely stoked. Coming from GNOME, the swich was a breath of fresh air.

But i must confess it has not been a rollercoaster ride which is the exact reason this blog post even exists in the first place. In this article, i would highlight a couple number of the awesome things about the OS and the ___not some awesome parts___. Do keep in mind that i don't put them in some list but i have ___them laced all over the article___.


### Installation

The installation was pretty smooth, fast and painless but i think i'd have to ___give props___ to 
the Ubuntu guys rather than the Elementary team since it uses the same installer <sup>0</sup>.

While the installation was frictionless, i did run into one ugly issue with my Wifi. It seemed to be disconnecting all of the time. ___It just wouldn't stay connected to the network for anything longer than 30 minutes___ and i had to keep on hitting `sudo ethernet reconfigure`. Thanks to the Elementary community on stackexchange, i was able to get this fixed. Again, i'd like to say i don't think this issue is particular to Elementary in any way as i remember running into something similar on __Ubuntu 14.04__ and __Ubuntu 15.10__ (both were clean installs).


### The Desktop Environment (Pantheon)

__Long live the Pantheon. May mere mortals never be found in the midst of the gods__


- Lightweight : The first time i noticed after installation was the weight of the desktop. It is/was extremely lightweight. If you ever used GNOME, you'd understand what i am driving at. GNOME eats up about 1gb RAM on startup. 

- Stateful : This is probably the most interesting thing about Pantheon. Applications always retain their state after you close them, logout or even a reboot.
It would be nice anyways to explain what i mean by ___retaining state___. When i refer to state, i am talking about things like :
	
	- Window size : Minimized a window ? close it or reboot your PC. When next you open up that app, it comes up minimized. This might look a stupid feature but i always get excited about this.

	- Opened Tabs : The best way to explain this is via the file manager, say i have 4 tabs opened and in each i am in some directory so deep like `/home/me/s/d/d/d/`. On a reboot, or ___reopening___ the file manager, i am presented a window that has all 4 tabs opened with each of them in the deep directory i left them at. 
	I take full advantage of this since a lot of my activites in the file manager is usually in 3 directories : `/home/adez/Documents`, `/home/adez/goat`, `/var/www/html/`. Although i keep a 4th tab - `/home/adez/` for miscellaneous operations. With this, navigating via the GUI is just gold. ___I hear the GUI slows you down a lot, well not with Elementary.___

	- Applications instances : For example, i am running two instance of Sublime text - a text editor - and for some reason, my computer crashes (or powers off if you have set a time it should go off). What i have noticed is the next time, i am in Pantheon and click on the Sublime text icon, i  get two windows instead of one. Dead drop simple.

- The top bar crashes all the time : Infact it crashed the first time i booted into Elementary :-D and it didn't ___recover___ until the PC got a reboot. 

> I don't know if reloading your GUI - without a reboot - would solve this.

To be clear, this went away after i ran `sudo apt get upgrade`, i couldn't upgrade immediately after the installation because of the wifi issue i had and subsequently, an issue with my ISP (after the wifi problem was solved). But word from a friend who used Loki (the latest Elementary release some time last year, 0.4) and Freya (0.3) - both for a short period of time - says it would still crash.

- Icons set are not too impressive : To be fair, i don't think the icon sets are anything interesting. Maybe i was expecting ___something off the hook___ considering the fact that they put in a lot of work into the design of the desktop. There's this reddit thread where everyone professes to getting rid of it and going with Numix and Arc and Numix being so popular, the elementary team should consider them the default icon set.

- Workspaces are a delight to work with : I love workspaces and i hope you do too. The Elementary team has put a lot of thought into this (and that is as true for the entire desktop experience) and has some sensible defaults. For instance `Super + 2` takes you to the second workspace and you cannot cycle through an app (window) not in the current workspace. That might sound trivial but considering the fact Unity and GNOME disable this and you have to go through a verbose method of installing a tweak tool to get the settings for this behaviour

> Well, you eventually would install a tweak tool regardless of the desktop environment. But that is just a pointer to the fact that Pantheon is different in the sense of ___stuffs working the way they are supposed to___.

- Disk usage bar : Remember that ugly windows external disk usage bar ? Elementary has got something of that sort but it isn't any where ugly. A snapshot in progress (Take a look at the devices section)

![Disk usage bar]({{site.baseurl}}/assets/img/pantheon-files.png)


### Default Applications and installation of new sofware

Elementary OS comes battery included albeit with a sensible battery size. The default installation comes with :

- A mail client which is actually a fork of Geary.

- A music player which looks so much like rythmbox. It most likely started life as a rythmbox fork.

- A terrible web browser, Epiphany that seems to be ___opinioniated on the websites it chooses to open___.

- A calendar that works.

The Elementary team maintain a very much comprehensive list [on their website][elementary]{:target="_blank"} and you'd want to take a look at that.

How about installation of new stuffs ? 

Well, that works as well and Elementary has a lot to thank Ubuntu for since it makes use of the same `apt` command and has access to the extremely large Ubuntu repositories.

Apparently, Elementary suffers from the same problem as Ubuntu in terms of not having the latest software releases in their repos. Coming from Fedora where you can live on the bleeding edge of things, this is actually a thumbs down for Elementary.


### The Community

I cannot say if the community should actually be a major reason for choosing a Linux distro but i want to believe it has a lot to play when it comes to troubleshooting. Whilst Elementary has a very small community, it seems yet again to benefit from the very much titanic Ubuntu community.


In conclusion, i feel Elementary - by the time it gets a 1.0 release - ___might be a silver bullet___ for the linux desktop environment. I remember my sibling whining about my Ubuntu install ___the other year___, same thing with Fedora, i don't know what he thinks of Elementary as he haven't seen this yet but i think it is safe to say this is something he'd like.

### Footnotes

[0]- At least it looks like Ubuntu installer, so it is save to assume it uses Ubuntu's installer


[elementary]: https://elementaryos.com
