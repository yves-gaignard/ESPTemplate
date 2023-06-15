#
# Pre-build procedure to create automatically an include/version.h file containing the version of the application and its build timestamp.
# If you want to change the default version, create a file version.txt at the root directory of the project containin the version name
#
from datetime import datetime, timezone

FILENAME_BUILDNO = 'version.txt'
FILENAME_VERSION_H = 'include/version.h'

import datetime

build_no = 'v1.0.0'
try:
    with open(FILENAME_BUILDNO) as f:
        build_no = f.readline()
except:
    print('Starting build number from v1.0.0.')
    build_no = 'v1.0.0'
with open(FILENAME_BUILDNO, 'w+') as f:
    f.write(str(build_no))
    print('Build number: {}'.format(build_no))

# get current datetime in local time and format it
currentTimestamp = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
# or get current datetime in UTC and format it
# currentTimestamp =  datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

hf = """
#ifndef APP_BUILD_TIMESTAMP
  #define APP_BUILD_TIMESTAMP "{}"
#endif
#ifndef APP_VERSION_TIMESTAMP
  #define APP_VERSION_TIMESTAMP "{}-{}"
#endif
#ifndef APP_VERSION
  #define APP_VERSION "{}"
#endif
""".format(str(currentTimestamp), str(build_no), str(currentTimestamp), str(build_no))
with open(FILENAME_VERSION_H, 'w+') as f:
    f.write(hf)